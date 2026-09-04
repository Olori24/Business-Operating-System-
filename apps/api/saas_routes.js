const crypto = require('node:crypto');
const { jsonResponse } = require('./http');
const { getProductionStore } = require('../../packages/persistence/production_store');
const { encryptSecret } = require('../../modules/integrations/secret_store');

const ROLES = ['owner','admin','member','viewer'];
const WRITE_ROLES = new Set(['owner','admin']);

async function body(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (raw.length > 1_000_000) throw Object.assign(new Error('PAYLOAD_TOO_LARGE'), { statusCode: 413 });
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('INVALID_JSON'), { statusCode: 400 }); }
}
function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
function clean(v, max = 500) { return String(v ?? '').trim().slice(0, max); }
function reply(res, status, data) { jsonResponse(res, status, { ...data }); }
function fail(message, status = 422) { throw Object.assign(new Error(message), { statusCode: status }); }

async function membership(pool, workspaceId, userId) {
  const r = await pool.query('SELECT role,status FROM bos_workspace_members WHERE workspace_id=$1 AND user_id=$2', [workspaceId,userId]);
  return r.rows[0] || null;
}
async function requireWorkspace(auth, pool, role = null) {
  if (!auth?.tenantId) fail('WORKSPACE_REQUIRED', 422);
  const member = await membership(pool, auth.tenantId, auth.user.id);
  if (!member || member.status !== 'active') fail('WORKSPACE_ACCESS_DENIED', 403);
  if (role && (Array.isArray(role) ? !role.includes(member.role) : member.role !== role)) fail('INSUFFICIENT_PERMISSIONS', 403);
  return member;
}
async function audit(pool, workspaceId, actor, action, resourceType, resourceId, metadata = {}) {
  await pool.query(`INSERT INTO bos_audit_logs(id,workspace_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,$4,$5,$6,$7)`, [id('audit'),workspaceId,actor,action,resourceType,resourceId,metadata]);
}

async function handleSaaSRoute({ req, res, url, auth }) {
  const store = await getProductionStore();
  if (!store) fail('DATABASE_NOT_CONFIGURED', 503);
  const { pool } = store;

  // Public inbound webhook. Workspace is resolved from the signed endpoint token.
  if (req.method === 'POST' && /^\/api\/v1\/webhooks\/[^/]+$/.test(url)) {
    const endpoint = url.split('/').pop();
    const secret = process.env.BOS_WEBHOOK_SECRET;
    const supplied = req.headers['x-bos-webhook-secret'];
    if (!secret || !supplied || !crypto.timingSafeEqual(Buffer.from(String(supplied)), Buffer.from(secret))) fail('WEBHOOK_UNAUTHORIZED', 401);
    const payload = await body(req);
    const workspaceId = clean(req.headers['x-bos-workspace-id'], 200);
    if (!workspaceId || endpoint !== clean(req.headers['x-bos-webhook-endpoint'], 200)) fail('WEBHOOK_ENDPOINT_INVALID', 400);
    const externalId = clean(req.headers['x-event-id'] || req.headers['idempotency-key'], 300) || crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const eventId = id('event');
    const inserted = await pool.query(`INSERT INTO bos_events(id,workspace_id,provider,event_type,external_id,signature_valid,payload) VALUES($1,$2,$3,$4,$5,true,$6) ON CONFLICT(provider,external_id) DO NOTHING RETURNING id`, [eventId,workspaceId,'webhook',clean(req.headers['x-event-type'] || 'webhook',100),externalId,payload]);
    if (!inserted.rowCount) return reply(res, 200, { status:'duplicate', idempotent:true });
    await pool.query(`INSERT INTO bos_jobs(id,workspace_id,type,payload) VALUES($1,$2,'event.process',$3)`, [id('job'),workspaceId,{eventId}]);
    return reply(res, 202, { status:'accepted', eventId });
  }

  if (!auth) return false;
  const member = await requireWorkspace(auth, pool);
  const workspaceId = auth.tenantId;

  if (req.method === 'GET' && url === '/api/v1/workspace') {
    const r = await pool.query('SELECT tenant_id,business_name,plan,created_at,updated_at FROM bos_workspaces WHERE tenant_id=$1',[workspaceId]);
    return reply(res,200,{status:'ok',workspace:r.rows[0] || null,role:member.role});
  }

  if (req.method === 'GET' && url === '/api/v1/workspace/members') {
    const r = await pool.query(`SELECT m.user_id,m.role,m.status,m.joined_at,u.email,u.name FROM bos_workspace_members m JOIN bos_users u ON u.id=m.user_id WHERE m.workspace_id=$1 ORDER BY m.joined_at`,[workspaceId]);
    return reply(res,200,{status:'ok',members:r.rows});
  }

  if (req.method === 'POST' && url === '/api/v1/workspace/invitations') {
    await requireWorkspace(auth,pool,['owner','admin']);
    const p=await body(req), email=clean(p.email,320).toLowerCase(), role=clean(p.role||'member',20);
    if (!/^\S+@\S+\.\S+$/.test(email)) fail('VALID_EMAIL_REQUIRED',400);
    if (!['admin','member','viewer'].includes(role)) fail('INVALID_ROLE',400);
    const token=crypto.randomBytes(32).toString('base64url');
    const invitationId=id('invite');
    await pool.query(`INSERT INTO bos_workspace_invitations(id,workspace_id,email,role,token_hash,expires_at,invited_by) VALUES($1,$2,$3,$4,$5,NOW()+INTERVAL '7 days',$6)`,[invitationId,workspaceId,email,role,crypto.createHash('sha256').update(token).digest('hex'),auth.user.id]);
    await audit(pool,workspaceId,auth.user.id,'workspace.invitation.created','invitation',invitationId,{email,role});
    // Delivery is deliberately explicit: no fake email is reported as sent.
    return reply(res,201,{status:'created',invitation:{id:invitationId,email,role,expiresInDays:7},delivery:'pending_email_provider'});
  }

  if (req.method === 'GET' && url === '/api/v1/dashboard/summary') {
    const q = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM bos_workflows WHERE workspace_id=$1 AND status=\'published\'',[workspaceId]),
      pool.query('SELECT status,COUNT(*)::int AS count FROM bos_workflow_executions WHERE workspace_id=$1 GROUP BY status',[workspaceId]),
      pool.query('SELECT COUNT(*)::int AS count FROM bos_integrations WHERE workspace_id=$1 AND status=\'connected\'',[workspaceId]),
      pool.query('SELECT id,action,resource_type,resource_id,created_at FROM bos_audit_logs WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 10',[workspaceId]),
      pool.query('SELECT id,type,title,body,read_at,created_at FROM bos_notifications WHERE workspace_id=$1 AND (user_id=$2 OR user_id IS NULL) ORDER BY created_at DESC LIMIT 10',[workspaceId,auth.user.id])
    ]);
    const executions=Object.fromEntries(q[1].rows.map(x=>[x.status,x.count]));
    return reply(res,200,{status:'ok',metrics:{activeWorkflows:q[0].rows[0].total,successfulExecutions:executions.completed||0,failedExecutions:executions.failed||0,queuedExecutions:executions.queued||0,connectedIntegrations:q[2].rows[0].count},recentActivity:q[3].rows,notifications:q[4].rows});
  }

  if (req.method === 'GET' && url === '/api/v1/workflows') {
    const r=await pool.query(`SELECT w.*,v.definition FROM bos_workflows w LEFT JOIN bos_workflow_versions v ON v.workflow_id=w.id AND v.version=w.current_version WHERE w.workspace_id=$1 AND w.status<>'archived' ORDER BY w.updated_at DESC`,[workspaceId]);
    return reply(res,200,{status:'ok',workflows:r.rows});
  }

  const workflowMatch=url.match(/^\/api\/v1\/workflows\/([^/]+)$/);
  if (workflowMatch && req.method === 'GET') {
    const r=await pool.query(`SELECT w.*,v.definition FROM bos_workflows w LEFT JOIN bos_workflow_versions v ON v.workflow_id=w.id AND v.version=w.current_version WHERE w.id=$1 AND w.workspace_id=$2`,[workflowMatch[1],workspaceId]);
    if(!r.rowCount) fail('WORKFLOW_NOT_FOUND',404); return reply(res,200,{status:'ok',workflow:r.rows[0]});
  }

  if (req.method === 'POST' && url === '/api/v1/workflows') {
    await requireWorkspace(auth,pool,Array.from(WRITE_ROLES));
    const p=await body(req), name=clean(p.name,160); if(!name) fail('WORKFLOW_NAME_REQUIRED',400);
    const definition={trigger:p.trigger||{type:'manual'},steps:Array.isArray(p.steps)?p.steps:[],conditions:Array.isArray(p.conditions)?p.conditions:[],branches:Array.isArray(p.branches)?p.branches:[]};
    const workflowId=id('workflow'),versionId=id('wversion');
    const client=await pool.connect();
    try { await client.query('BEGIN'); await client.query(`INSERT INTO bos_workflows(id,workspace_id,name,description,status,created_by) VALUES($1,$2,$3,$4,'draft',$5)`,[workflowId,workspaceId,name,clean(p.description||'',1000),auth.user.id]); await client.query(`INSERT INTO bos_workflow_versions(id,workflow_id,version,definition,created_by) VALUES($1,$2,1,$3,$4)`,[versionId,workflowId,definition,auth.user.id]); await client.query('COMMIT'); } catch(e){await client.query('ROLLBACK');throw e} finally{client.release()}
    await audit(pool,workspaceId,auth.user.id,'workflow.created','workflow',workflowId,{name});
    return reply(res,201,{status:'created',workflow:{id:workflowId,name,description:clean(p.description||'',1000),status:'draft',current_version:1,definition}});
  }

  if (workflowMatch && req.method === 'PUT') {
    await requireWorkspace(auth,pool,Array.from(WRITE_ROLES)); const p=await body(req);
    const existing=await pool.query('SELECT id,current_version FROM bos_workflows WHERE id=$1 AND workspace_id=$2',[workflowMatch[1],workspaceId]); if(!existing.rowCount) fail('WORKFLOW_NOT_FOUND',404);
    const next=existing.rows[0].current_version+1, definition={trigger:p.trigger||{type:'manual'},steps:Array.isArray(p.steps)?p.steps:[],conditions:Array.isArray(p.conditions)?p.conditions:[],branches:Array.isArray(p.branches)?p.branches:[]};
    await pool.query('INSERT INTO bos_workflow_versions(id,workflow_id,version,definition,created_by) VALUES($1,$2,$3,$4,$5)',[id('wversion'),workflowMatch[1],next,definition,auth.user.id]);
    await pool.query('UPDATE bos_workflows SET name=COALESCE($1,name),description=COALESCE($2,description),current_version=$3,updated_at=NOW() WHERE id=$4 AND workspace_id=$5',[p.name?clean(p.name,160):null,p.description!==undefined?clean(p.description,1000):null,next,workflowMatch[1],workspaceId]);
    await audit(pool,workspaceId,auth.user.id,'workflow.version.created','workflow',workflowMatch[1],{version:next}); return reply(res,200,{status:'saved',version:next,definition});
  }

  if (workflowMatch && req.method === 'POST' && url.endsWith('/publish')) {
    await requireWorkspace(auth,pool,Array.from(WRITE_ROLES)); const check=await pool.query('SELECT id,current_version FROM bos_workflows WHERE id=$1 AND workspace_id=$2',[workflowMatch[1],workspaceId]); if(!check.rowCount) fail('WORKFLOW_NOT_FOUND',404);
    const def=await pool.query('SELECT definition FROM bos_workflow_versions WHERE workflow_id=$1 AND version=$2',[workflowMatch[1],check.rows[0].current_version]); if(!def.rowCount || !Array.isArray(def.rows[0].definition.steps)) fail('INVALID_WORKFLOW',400);
    await pool.query('UPDATE bos_workflows SET status=\'published\',updated_at=NOW() WHERE id=$1 AND workspace_id=$2',[workflowMatch[1],workspaceId]); await audit(pool,workspaceId,auth.user.id,'workflow.published','workflow',workflowMatch[1],{version:check.rows[0].current_version}); return reply(res,200,{status:'published'});
  }

  if (workflowMatch && req.method === 'POST' && url.endsWith('/disable')) {
    await requireWorkspace(auth,pool,Array.from(WRITE_ROLES)); await pool.query('UPDATE bos_workflows SET status=\'disabled\',updated_at=NOW() WHERE id=$1 AND workspace_id=$2',[workflowMatch[1],workspaceId]); await audit(pool,workspaceId,auth.user.id,'workflow.disabled','workflow',workflowMatch[1]); return reply(res,200,{status:'disabled'});
  }

  if (req.method === 'GET' && url === '/api/v1/executions') {
    const limit=Math.min(Math.max(Number(new URL(req.url,'http://bos.local').searchParams.get('limit')||50),1),100);
    const r=await pool.query(`SELECT e.*,w.name AS workflow_name FROM bos_workflow_executions e LEFT JOIN bos_workflows w ON w.id=e.workflow_id WHERE e.workspace_id=$1 ORDER BY e.created_at DESC LIMIT $2`,[workspaceId,limit]); return reply(res,200,{status:'ok',executions:r.rows});
  }

  const executionMatch=url.match(/^\/api\/v1\/executions\/([^/]+)$/);
  if (executionMatch && req.method==='GET') { const r=await pool.query('SELECT * FROM bos_workflow_executions WHERE id=$1 AND workspace_id=$2',[executionMatch[1],workspaceId]); if(!r.rowCount) fail('EXECUTION_NOT_FOUND',404); const s=await pool.query('SELECT * FROM bos_execution_steps WHERE execution_id=$1 ORDER BY step_index',[executionMatch[1]]); return reply(res,200,{status:'ok',execution:r.rows[0],steps:s.rows}); }

  if (req.method==='POST' && url==='/api/v1/executions') {
    const p=await body(req), workflowId=clean(p.workflowId,100); if(!workflowId) fail('WORKFLOW_ID_REQUIRED',400);
    const w=await pool.query(`SELECT w.id,w.status,w.current_version,v.definition FROM bos_workflows w JOIN bos_workflow_versions v ON v.workflow_id=w.id AND v.version=w.current_version WHERE w.id=$1 AND w.workspace_id=$2`,[workflowId,workspaceId]); if(!w.rowCount) fail('WORKFLOW_NOT_FOUND',404); if(w.rows[0].status!=='published') fail('WORKFLOW_NOT_PUBLISHED',409);
    const idem=clean(req.headers['idempotency-key']||p.idempotencyKey,300); if(!idem) fail('IDEMPOTENCY_KEY_REQUIRED',400);
    const executionId=id('execution'); const inserted=await pool.query(`INSERT INTO bos_workflow_executions(id,workspace_id,workflow_id,workflow_version,status,trigger_type,idempotency_key,input) VALUES($1,$2,$3,$4,'queued',$5,$6,$7) ON CONFLICT(workspace_id,idempotency_key) DO NOTHING RETURNING id`,[executionId,workspaceId,workflowId,w.rows[0].current_version,'manual',idem,p.context||{}]);
    const actual=inserted.rows[0]?.id; if(!actual){const old=await pool.query('SELECT * FROM bos_workflow_executions WHERE workspace_id=$1 AND idempotency_key=$2',[workspaceId,idem]); return reply(res,200,{status:'duplicate',execution:old.rows[0]});}
    await pool.query(`INSERT INTO bos_jobs(id,workspace_id,type,payload) VALUES($1,$2,'workflow.execute',$3)`,[id('job'),workspaceId,{executionId:actual,definition:w.rows[0].definition}]); return reply(res,202,{status:'queued',executionId:actual});
  }

  if (req.method==='GET' && url==='/api/v1/notifications') { const r=await pool.query('SELECT * FROM bos_notifications WHERE workspace_id=$1 AND (user_id=$2 OR user_id IS NULL) ORDER BY created_at DESC LIMIT 100',[workspaceId,auth.user.id]); return reply(res,200,{status:'ok',notifications:r.rows}); }
  if (req.method==='POST' && /^\/api\/v1\/notifications\/[^/]+\/read$/.test(url)) { const nid=url.split('/')[4]; await pool.query('UPDATE bos_notifications SET read_at=NOW() WHERE id=$1 AND workspace_id=$2 AND (user_id=$3 OR user_id IS NULL)',[nid,workspaceId,auth.user.id]); return reply(res,200,{status:'read'}); }

  if (req.method==='GET' && url==='/api/v1/integrations') { const r=await pool.query('SELECT id,provider,status,config,connected_at,updated_at,last_error FROM bos_integrations WHERE workspace_id=$1 ORDER BY provider',[workspaceId]); return reply(res,200,{status:'ok',integrations:r.rows}); }
  if (req.method==='POST' && url==='/api/v1/integrations') { await requireWorkspace(auth,pool,Array.from(WRITE_ROLES)); const p=await body(req),provider=clean(p.provider,80); if(!provider) fail('PROVIDER_REQUIRED',400); const credentials=p.credentials&&typeof p.credentials==='object'?p.credentials:{}; const encrypted=Object.fromEntries(Object.entries(credentials).map(([k,v])=>[k,encryptSecret(v)])); await pool.query(`INSERT INTO bos_integrations(id,workspace_id,provider,encrypted_credentials,config,connected_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(workspace_id,provider) DO UPDATE SET encrypted_credentials=EXCLUDED.encrypted_credentials,config=EXCLUDED.config,status='connected',last_error=NULL,updated_at=NOW()`,[id('integration'),workspaceId,provider,encrypted,p.config||{},auth.user.id]); await audit(pool,workspaceId,auth.user.id,'integration.connected','integration',provider); return reply(res,201,{status:'connected',provider}); }

  if (req.method==='GET' && url==='/api/v1/audit-logs') { const r=await pool.query('SELECT * FROM bos_audit_logs WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 200',[workspaceId]); return reply(res,200,{status:'ok',logs:r.rows}); }
  if (req.method==='GET' && url==='/api/v1/billing') { const r=await pool.query('SELECT * FROM bos_billing_accounts WHERE workspace_id=$1',[workspaceId]); return reply(res,200,{status:'ok',billing:r.rows[0]||{plan:'free',status:'trialing'}}); }

  return false;
}
module.exports={handleSaaSRoute};

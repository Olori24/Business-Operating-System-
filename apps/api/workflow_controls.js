const { getProductionStore } = require('../../packages/persistence/production_store');
const { jsonResponse } = require('./http');
const crypto = require('node:crypto');

async function read(req){let s='';for await(const c of req)s+=c;try{return s?JSON.parse(s):{}}catch{throw Object.assign(new Error('INVALID_JSON'),{statusCode:400});}}
const fail=(m,s=422)=>{throw Object.assign(new Error(m),{statusCode:s});};
const audit=async(pool,w,u,a,rid,meta={})=>pool.query(`INSERT INTO bos_audit_logs(id,workspace_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,$4,'workflow',$5,$6)`,[`audit_${crypto.randomUUID()}`,w,u,a,rid,meta]);
async function handleWorkflowControl({req,res,url,auth}){
 if(!auth)return false;
 const m=url.match(/^\/api\/v1\/workflows\/([^/]+)\/(publish|disable)$/); if(!m)return false;
 const store=await getProductionStore();if(!store)fail('DATABASE_NOT_CONFIGURED',503);const {pool}=store;
 const role=await pool.query('SELECT role FROM bos_workspace_members WHERE workspace_id=$1 AND user_id=$2 AND status=\'active\'',[auth.tenantId,auth.user.id]);if(!role.rowCount||!['owner','admin'].includes(role.rows[0].role))fail('INSUFFICIENT_PERMISSIONS',403);
 const w=await pool.query('SELECT id,current_version FROM bos_workflows WHERE id=$1 AND workspace_id=$2',[m[1],auth.tenantId]);if(!w.rowCount)fail('WORKFLOW_NOT_FOUND',404);
 if(m[2]==='publish'){const v=await pool.query('SELECT definition FROM bos_workflow_versions WHERE workflow_id=$1 AND version=$2',[m[1],w.rows[0].current_version]);if(!v.rowCount)fail('WORKFLOW_VERSION_NOT_FOUND',404);const d=v.rows[0].definition||{};if(!d.trigger||!Array.isArray(d.steps))fail('INVALID_WORKFLOW',400);await pool.query("UPDATE bos_workflows SET status='published',updated_at=NOW() WHERE id=$1",[m[1]]);await audit(pool,auth.tenantId,auth.user.id,'workflow.published',m[1],{version:w.rows[0].current_version});return jsonResponse(res,200,{status:'published',version:w.rows[0].current_version});}
 await pool.query("UPDATE bos_workflows SET status='disabled',updated_at=NOW() WHERE id=$1",[m[1]]);await audit(pool,auth.tenantId,auth.user.id,'workflow.disabled',m[1]);return jsonResponse(res,200,{status:'disabled'});
}
module.exports={handleWorkflowControl,read};

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { jsonResponse } = require('./http');
const { requestContext, errorPayload } = require('./middleware');
const { AutomationEngine } = require('../../modules/automation/engine');
const { getProductionStore } = require('../../packages/persistence/production_store');
const { onboarding, workflow, automationRun, whatsappConnect } = require('../../packages/validation/schemas');
const { recordRequest, recordError, snapshot } = require('../../packages/observability/metrics');
const { getSession, parseCookies, clearSessionCookie, getWorkspaceForUser, createOrUpdateWorkspace } = require('../../packages/auth/email_auth');
const { sendOutboundWebhook } = require('../../modules/integrations/outbound_webhook');
const { encryptSecret } = require('../../modules/integrations/secret_store');
const { sendWhatsAppMessage } = require('../../modules/integrations/whatsapp_cloud');
const { logger, captureException } = require('../../packages/observability/logger');
const { handleSaaSRoute } = require('./saas_routes');
const { handleWorkflowControl } = require('./workflow_controls');
const { startProductionWorker } = require('../../modules/automation/production_worker');

const port = Number(process.env.PORT || 3000);
const apiVersion = 'v1';
const dashboardPath = path.join(__dirname, '..', 'dashboard', 'index.html');
const onboardingPath = path.join(__dirname, '..', 'dashboard', 'onboarding.html');
const workflowBuilderPath = path.join(__dirname, '..', 'dashboard', 'workflows.html');
const aiEmployeePath = path.join(__dirname, '..', 'dashboard', 'ai-employees.html');
const integrationPath = path.join(__dirname, '..', 'dashboard', 'integrations.html');
const executionPath = path.join(__dirname, '..', 'dashboard', 'execution.html');
const analyticsPath = path.join(__dirname, '..', 'dashboard', 'analytics.html');
const billingPath = path.join(__dirname, '..', 'dashboard', 'billing.html');
const supportPath = path.join(__dirname, '..', 'dashboard', 'support.html');
const launchPath = path.join(__dirname, '..', 'dashboard', 'launch-readiness.html');

async function storeRequired(){const store=await getProductionStore();if(!store)throw new Error('DATABASE_NOT_CONFIGURED');return store;}
async function record(tenantId,type,value){const store=await storeRequired();const id=value.id||crypto.randomUUID();return store.repository.save(tenantId,type,id,{...value,id});}
async function integration(tenantId,type,id){const store=await storeRequired();return store.repository.find(tenantId,type,id);}
async function authenticate(req){const session=await getSession(parseCookies(req).bos_session);if(!session)return null;const workspace=await getWorkspaceForUser(session.user_id);return{session,user:{id:session.user_id,email:session.email,name:session.name},workspace,tenantId:workspace?.tenantId||null};}
async function requireAuth(req){const auth=await authenticate(req);if(!auth){const e=new Error('UNAUTHENTICATED');e.statusCode=401;throw e;}return auth;}
function htmlResponse(res,filePath){try{const html=fs.readFileSync(filePath,'utf8');res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);}catch{jsonResponse(res,500,{status:'error',code:'PAGE_UNAVAILABLE'});}}
function readJson(req){return new Promise((resolve,reject)=>{let body='';req.setEncoding('utf8');req.on('data',chunk=>{body+=chunk;if(body.length>100000)req.destroy();});req.on('end',()=>{try{resolve(body?JSON.parse(body):{});}catch{reject(new Error('INVALID_JSON'));}});req.on('error',reject);});}
function executionStatus(results){if(!results.length)return'skipped';if(results.some(r=>r?.status==='failed'))return'failed';if(results.some(r=>r?.status==='queued'))return'queued';return'completed';}
const automationEngine=new AutomationEngine({actions:{
 create_task:async({tenantId,input})=>record(tenantId,'task',{status:'completed',source:'automation',input}),
 notify_sales:async({tenantId,input})=>record(tenantId,'sales_notification',{status:'queued',source:'automation',input}),
 ai_followup:async({tenantId,input})=>record(tenantId,'ai_followup',{status:'queued',source:'automation',input}),
 outbound_webhook:async({tenantId,input,context})=>{const result=await sendOutboundWebhook({url:input.url,payload:{tenantId,context,input:input.payload||{}},headers:input.headers||{},timeoutMs:input.timeoutMs});return record(tenantId,'outbound_webhook',{status:result.ok?'completed':'failed',source:'automation',result});},
 whatsapp_send:async({tenantId,input})=>{const config=await integration(tenantId,'integration','whatsapp');if(!config)throw new Error('WHATSAPP_NOT_CONNECTED');const result=await sendWhatsAppMessage({config,to:input.to,text:input.text});return record(tenantId,'whatsapp_message',{status:'completed',source:'automation',to:input.to,messageId:result.messages?.[0]?.id||null,result});}
}});

async function requestHandler(req,res){recordRequest();const context=requestContext(req);const{requestId}=context;const startedAt=context.startedAt||Date.now();const url=String(req.url||'').split('?')[0];res.setHeader('x-request-id',requestId);if(typeof res.once==='function')res.once('finish',()=>logger.info({requestId,method:req.method,path:url,statusCode:res.statusCode,durationMs:Date.now()-startedAt},'request completed'));
 try{
  if(req.method==='GET'&&(url==='/health'||url==='/api/health')){jsonResponse(res,200,{status:'ok',service:'bos-api',requestId});return;}
  if(req.method==='GET'&&url==='/api/metrics'){jsonResponse(res,200,{status:'ok',service:'bos-api',metrics:snapshot()});return;}
  if(req.method==='GET'&&(url==='/'||url==='/dashboard'))return htmlResponse(res,dashboardPath);
  if(req.method==='GET'&&(url==='/start'||url==='/onboarding'))return htmlResponse(res,onboardingPath);
  if(req.method==='GET'&&(url==='/workflows'||url==='/dashboard/workflows'))return htmlResponse(res,workflowBuilderPath);
  if(req.method==='GET'&&(url==='/ai-employees'||url==='/dashboard/ai-employees'))return htmlResponse(res,aiEmployeePath);
  if(req.method==='GET'&&(url==='/integrations'||url==='/dashboard/integrations'))return htmlResponse(res,integrationPath);
  if(req.method==='GET'&&(url==='/execution'||url==='/dashboard/execution'))return htmlResponse(res,executionPath);
  if(req.method==='GET'&&(url==='/analytics'||url==='/dashboard/analytics'))return htmlResponse(res,analyticsPath);
  if(req.method==='GET'&&(url==='/billing'||url==='/dashboard/billing'))return htmlResponse(res,billingPath);
  if(req.method==='GET'&&(url==='/support'||url==='/dashboard/support'))return htmlResponse(res,supportPath);
  if(req.method==='GET'&&(url==='/launch'||url==='/dashboard/launch'))return htmlResponse(res,launchPath);

  const auth=await authenticate(req);
  if(await handleWorkflowControl({req,res,url,auth}))return;
  if(await handleSaaSRoute({req,res,url,auth}))return;

  if(req.method==='POST'&&url==='/api/v1/onboarding'){const a=await requireAuth(req);const payload=onboarding(await readJson(req));const workspace=await createOrUpdateWorkspace({userId:a.user.id,businessName:payload.businessName,email:a.user.email,ownerName:a.user.name,authProvider:'email'});const store=await storeRequired();await store.pool.query(`INSERT INTO bos_workspace_members(workspace_id,user_id,role,status) VALUES($1,$2,'owner','active') ON CONFLICT DO NOTHING`,[workspace.tenantId,a.user.id]);jsonResponse(res,201,{status:'created',tenantId:workspace.tenantId,workspace,requestId});return;}
  if(req.method==='GET'&&url==='/api/v1/workflows'){const a=await requireAuth(req);if(!a.tenantId)throw new Error('WORKSPACE_REQUIRED');const store=await storeRequired();const workflows=await store.repository.all(a.tenantId,'workflow');jsonResponse(res,200,{status:'ok',workflows,requestId});return;}
  if(req.method==='POST'&&url==='/api/v1/workflows'){const a=await requireAuth(req);if(!a.tenantId)throw new Error('WORKSPACE_REQUIRED');const payload=workflow(await readJson(req));const saved=await record(a.tenantId,'workflow',{name:payload.name,trigger:payload.trigger,steps:payload.steps,enabled:payload.enabled,createdBy:a.user.id});jsonResponse(res,201,{status:'created',workflow:saved,requestId});return;}
  if(req.method==='GET'&&url==='/api/v1/integrations/whatsapp'){const a=await requireAuth(req);if(!a.tenantId)throw new Error('WORKSPACE_REQUIRED');const config=await integration(a.tenantId,'integration','whatsapp');jsonResponse(res,200,{status:config?'connected':'not_connected',provider:'whatsapp_cloud',phoneNumberId:config?.phoneNumberId||null,requestId});return;}
  if(req.method==='POST'&&url==='/api/v1/integrations/whatsapp/connect'){const a=await requireAuth(req);if(!a.tenantId)throw new Error('WORKSPACE_REQUIRED');const payload=whatsappConnect(await readJson(req));await record(a.tenantId,'integration',{id:'whatsapp',provider:'whatsapp_cloud',phoneNumberId:payload.phoneNumberId,accessToken:encryptSecret(payload.accessToken),status:'connected',connectedBy:a.user.id});jsonResponse(res,201,{status:'connected',provider:'whatsapp_cloud',phoneNumberId:payload.phoneNumberId,requestId});return;}
  if(req.method==='POST'&&url==='/api/v1/automations/run'){const a=await requireAuth(req);if(!a.tenantId)throw new Error('WORKSPACE_REQUIRED');const payload=automationRun(await readJson(req));let steps=payload.steps;const workflowId=payload.workflowId||null;if(workflowId){const storedWorkflow=await integration(a.tenantId,'workflow',workflowId);if(!storedWorkflow)throw new Error('WORKFLOW_NOT_FOUND');if(storedWorkflow.enabled===false)throw new Error('WORKFLOW_DISABLED');steps=workflow({name:storedWorkflow.name||'stored',trigger:storedWorkflow.trigger||{type:'manual'},steps:storedWorkflow.steps}).steps;}const executionId=`execution_${crypto.randomUUID()}`;let execution;try{const result=await automationEngine.run({tenantId:a.tenantId,steps,context:payload.context||{}});execution=await record(a.tenantId,'execution',{id:executionId,workflowId,status:executionStatus(result.results),results:result.results,context:payload.context||{},userId:a.user.id});}catch(error){execution=await record(a.tenantId,'execution',{id:executionId,workflowId,status:'failed',error:error.message,userId:a.user.id});jsonResponse(res,422,{status:'failed',execution,requestId});return;}jsonResponse(res,200,{status:execution.status,execution,requestId});return;}
  if(req.method==='POST'&&url==='/api/v1/auth/logout'){const{revokeSession}=require('../../packages/auth/email_auth');await revokeSession(parseCookies(req).bos_session);clearSessionCookie(res);jsonResponse(res,200,{status:'signed_out',requestId});return;}
  if(req.method==='GET'&&url==='/api/v1/meta'){jsonResponse(res,200,{name:'Business Operating System',service:'bos-api',apiVersion,requestId});return;}
  jsonResponse(res,404,errorPayload('NOT_FOUND','Route not found',requestId));
 }catch(error){recordError();captureException(error,{requestId,method:req.method,path:url,tenantId:context.tenantId||null,statusCode:error.statusCode||500});const status=error.statusCode||(error instanceof TypeError||error.message==='INVALID_JSON'?400:error.message==='UNAUTHENTICATED'?401:422);const code=error.code==='VALIDATION_FAILED'?'VALIDATION_FAILED':status===401?'UNAUTHENTICATED':status===400?'INVALID_REQUEST':status===503?'SERVICE_UNAVAILABLE':'API_FAILED';logger.error({err:error,requestId,method:req.method,path:url,statusCode:status},'request failed');jsonResponse(res,status,errorPayload(code,error.message,requestId));}}
function startServer(){const server=http.createServer(requestHandler);server.listen(port,()=>logger.info({port},'BOS API listening'));startProductionWorker().catch(error=>logger.error({err:error},'BOS worker failed to start'));return server;}
if(require.main===module)startServer();
module.exports={requestHandler,startServer,authenticate};

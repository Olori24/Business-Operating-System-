const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { jsonResponse } = require('./http');
const { requestContext, errorPayload } = require('./middleware');
const { AutomationEngine } = require('../../modules/automation/engine');
const port = Number(process.env.PORT || 3000);
const apiVersion = 'v1';
const dashboardPath = path.join(__dirname, '..', 'dashboard', 'index.html');
const workflowBuilderPath = path.join(__dirname, '..', 'dashboard', 'workflows.html');
const aiEmployeePath = path.join(__dirname, '..', 'dashboard', 'ai-employees.html');
const integrationPath = path.join(__dirname, '..', 'dashboard', 'integrations.html');
const executionPath = path.join(__dirname, '..', 'dashboard', 'execution.html');
const analyticsPath = path.join(__dirname, '..', 'dashboard', 'analytics.html');
const automationEngine = new AutomationEngine({actions:{create_task:async({tenantId,input})=>({action:'create_task',tenantId,accepted:true,input}),notify_sales:async({tenantId,input})=>({action:'notify_sales',tenantId,accepted:true,input}),ai_followup:async({tenantId,input})=>({action:'ai_followup',tenantId,accepted:true,input})}});
function htmlResponse(res,filePath){try{const html=fs.readFileSync(filePath,'utf8');res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html)}catch{jsonResponse(res,500,{status:'error',code:'PAGE_UNAVAILABLE'})}}
function readJson(req){return new Promise((resolve,reject)=>{let body='';req.setEncoding('utf8');req.on('data',chunk=>{body+=chunk;if(body.length>100000)req.destroy()});req.on('end',()=>{try{resolve(body?JSON.parse(body):{})}catch{reject(new Error('INVALID_JSON'))}});req.on('error',reject)})}
async function requestHandler(req,res){const {requestId}=requestContext(req);res.setHeader('x-request-id',requestId);if(req.method==='GET'&&(req.url==='/health'||req.url==='/api/health')){jsonResponse(res,200,{status:'ok',service:'bos-api',requestId});return}if(req.method==='GET'&&(req.url==='/'||req.url==='/dashboard')){htmlResponse(res,dashboardPath);return}if(req.method==='GET'&&(req.url==='/workflows'||req.url==='/dashboard/workflows')){htmlResponse(res,workflowBuilderPath);return}if(req.method==='GET'&&(req.url==='/ai-employees'||req.url==='/dashboard/ai-employees')){htmlResponse(res,aiEmployeePath);return}if(req.method==='GET'&&(req.url==='/integrations'||req.url==='/dashboard/integrations')){htmlResponse(res,integrationPath);return}if(req.method==='GET'&&(req.url==='/execution'||req.url==='/dashboard/execution')){htmlResponse(res,executionPath);return}if(req.method==='GET'&&(req.url==='/analytics'||req.url==='/dashboard/analytics')){htmlResponse(res,analyticsPath);return}if(req.method==='POST'&&req.url==='/api/v1/automations/run'){try{const payload=await readJson(req);const tenantId=req.headers['x-tenant-id'];const result=await automationEngine.run({tenantId,steps:payload.steps,context:payload.context});jsonResponse(res,200,{status:'completed',execution:result,requestId})}catch(error){const status=error.message==='INVALID_JSON'||error instanceof TypeError?400:422;jsonResponse(res,status,errorPayload(status===400?'INVALID_REQUEST':'AUTOMATION_FAILED',error.message,requestId))}return}if(req.method==='GET'&&req.url==='/api/v1/meta'){jsonResponse(res,200,{name:'Business Operating System',service:'bos-api',apiVersion,requestId});return}jsonResponse(res,404,errorPayload('NOT_FOUND','Route not found',requestId))}
function startServer(){const server=http.createServer(requestHandler);server.listen(port,()=>console.log(`BOS API listening on port ${port}`));return server}if(require.main===module)startServer();module.exports={requestHandler,startServer};

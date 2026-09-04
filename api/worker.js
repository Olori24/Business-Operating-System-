const { getProductionStore } = require('../packages/persistence/production_store');
const { processJob } = require('../modules/automation/production_worker');

module.exports = async function worker(req,res){
  if(req.method!=='GET'&&req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  const expected=String(process.env.CRON_SECRET||'').trim();
  const supplied=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();
  if(!expected||supplied!==expected)return res.status(401).json({error:'UNAUTHORIZED'});
  const store=await getProductionStore();if(!store)return res.status(503).json({error:'DATABASE_NOT_CONFIGURED'});
  const client=await store.pool.connect();
  try{await client.query('BEGIN');const r=await client.query(`SELECT * FROM bos_jobs WHERE status='queued' AND run_at<=NOW() ORDER BY run_at,id FOR UPDATE SKIP LOCKED LIMIT 1`);if(!r.rowCount){await client.query('COMMIT');return res.status(200).json({status:'idle'});}const job=r.rows[0];await client.query(`UPDATE bos_jobs SET status='running',attempts=attempts+1,locked_at=NOW(),updated_at=NOW() WHERE id=$1`,[job.id]);await client.query('COMMIT');await processJob(store.pool,{...job,status:'running',attempts:job.attempts+1});return res.status(200).json({status:'processed',jobId:job.id});}catch(error){await client.query('ROLLBACK');return res.status(500).json({error:'WORKER_FAILED',message:error.message});}finally{client.release();}}

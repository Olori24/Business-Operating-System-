const crypto = require('node:crypto');
const { getProductionStore } = require('../../packages/persistence/production_store');
const { getSession } = require('../../packages/auth/email_auth');
function cookieValue(req,name){const raw=String(req.headers.cookie||'');const item=raw.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${name}=`));return item?decodeURIComponent(item.slice(name.length+1)):null}
async function authenticatedTenantId(req){const token=cookieValue(req,'bos_session');if(!token)return null;const store=await getProductionStore();if(!store)return null;
  const emailSession=await getSession(token).catch(()=>null);
  if(emailSession){const result=await store.pool.query("SELECT value FROM bos_records WHERE record_type='workspace' AND value->>'userId'=$1 LIMIT 1",[emailSession.user_id]).catch(()=>({rowCount:0,rows:[]}));if(result.rowCount)return result.rows[0].value.tenantId}
  const hash=crypto.createHash('sha256').update(token).digest('hex');
  const googleSession=await store.pool.query("SELECT tenant_id,value FROM bos_records WHERE record_type='auth_session' AND record_id=$1 LIMIT 1",[hash]).catch(()=>({rowCount:0,rows:[]}));
  if(googleSession.rowCount){const session=googleSession.rows[0].value;if(session?.expiresAt&&new Date(session.expiresAt).getTime()>Date.now())return googleSession.rows[0].tenant_id}
  return null;
}
async function resolveTenantId(req){return authenticatedTenantId(req)}
module.exports={authenticatedTenantId,resolveTenantId};

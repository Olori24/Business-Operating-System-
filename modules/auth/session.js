const crypto = require('node:crypto');
const { getProductionStore } = require('../../packages/persistence/production_store');
const { getSession } = require('../../packages/auth/email_auth');
function cookieValue(req,name){const raw=String(req.headers.cookie||'');const item=raw.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${name}=`));return item?decodeURIComponent(item.slice(name.length+1)):null}
async function authenticatedTenantId(req){const token=cookieValue(req,'bos_session');if(!token)return null;const store=await getProductionStore();if(!store)return null;
  const emailSession=await getSession(token).catch(()=>null);
  if(emailSession){const user=await store.repository.find('global','user',emailSession.user_id).catch(()=>null);if(user?.tenantId)return user.tenantId}
  const hash=crypto.createHash('sha256').update(token).digest('hex');const users=await store.repository.all('global','user').catch(()=>[]);
  for(const user of users){if(!user?.tenantId)continue;const record=await store.repository.find(user.tenantId,'auth_session',hash).catch(()=>null);if(record?.expiresAt&&new Date(record.expiresAt).getTime()>Date.now())return user.tenantId}
  return null;
}
async function resolveTenantId(req){const authenticated=await authenticatedTenantId(req);if(authenticated)return authenticated;const header=req.headers['x-tenant-id'];return typeof header==='string'&&header.length<=128?header:null}
module.exports={authenticatedTenantId,resolveTenantId};

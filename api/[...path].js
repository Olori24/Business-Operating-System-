const crypto = require('node:crypto');
const { requestHandler } = require('../apps/api/server');
const { getProductionStore } = require('../packages/persistence/production_store');
const { register, createSession, getSession, setSessionCookie, parseCookies } = require('../packages/auth/email_auth');

async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw='';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

async function googleAuth(req, res) {
  const clientId=String(process.env.GOOGLE_CLIENT_ID||'').trim();
  if (!clientId) return res.status(503).json({error:{code:'GOOGLE_AUTH_NOT_CONFIGURED',message:'Google sign-in is not configured for this deployment'}});
  const data=await body(req);
  const credential=String(data.credential||'').trim();
  const businessName=String(data.businessName||'').trim();
  if(!credential||!businessName) return res.status(400).json({error:{code:'INVALID_INPUT',message:'Google credential and businessName are required'}});
  const tokenResponse=await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  const google=await tokenResponse.json();
  if(!tokenResponse.ok||google.aud!==clientId||!['accounts.google.com','https://accounts.google.com'].includes(google.iss)||google.email_verified!=='true') return res.status(401).json({error:{code:'GOOGLE_AUTH_INVALID',message:'Google authentication could not be verified'}});
  const email=String(google.email||'').trim().toLowerCase();
  const name=String(google.name||email.split('@')[0]||'BOS user').trim();
  const subject=String(google.sub||'').trim();
  if(!email||!subject) return res.status(401).json({error:{code:'GOOGLE_PROFILE_INVALID',message:'Google profile is incomplete'}});
  const store=await getProductionStore();
  if(!store) return res.status(503).json({error:{code:'DATABASE_NOT_CONFIGURED',message:'Production database is not configured'}});
  await store.pool.query(`CREATE TABLE IF NOT EXISTS bos_users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  const existing=await store.pool.query('SELECT id,email,name,status FROM bos_users WHERE email=$1',[email]);
  let user=existing.rows[0];
  if(!user){user=await register({email,password:crypto.randomBytes(32).toString('hex'),name});}
  const session=await createSession(user.id);
  setSessionCookie(res,session);
  const tenantId=`google_${crypto.createHash('sha256').update(subject).digest('hex').slice(0,24)}`;
  const now=new Date().toISOString();
  await store.repository.save(tenantId,'workspace','profile',{tenantId,userId:user.id,businessName,ownerName:name,email,authProvider:'google',googleSubject:subject,plan:'early_access_free',createdAt:now,updatedAt:now});
  return res.status(200).json({status:'authenticated',tenantId,workspace:{tenantId,businessName,ownerName:name,email,plan:'early_access_free'}});
}

module.exports = async function catchAll(req,res){
  const url=req.url.split('?')[0];
  try{
    if(req.method==='GET'&&url==='/api/health') return res.status(200).json({status:'ok',service:'bos-api'});
    if(req.method==='GET'&&url==='/api/v1/auth/google-config'){
      const clientId=String(process.env.GOOGLE_CLIENT_ID||'').trim();
      if(!clientId) return res.status(503).json({error:{code:'GOOGLE_AUTH_NOT_CONFIGURED',message:'Google sign-in is not configured for this deployment'}});
      return res.status(200).json({clientId});
    }
    if(req.method==='POST'&&url==='/api/v1/auth/google') return googleAuth(req,res);
    return requestHandler(req,res);
  }catch(error){return res.status(500).json({error:{code:'API_FAILED',message:error.message}})}
};

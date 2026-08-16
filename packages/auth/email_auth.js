const crypto = require('node:crypto');
const { getProductionStore } = require('../persistence/production_store');

const SESSION_DAYS = 30;

async function ensureAuthSchema() {
  const store = await getProductionStore();
  if (!store) throw new Error('DATABASE_NOT_CONFIGURED');
  await store.pool.query(`CREATE TABLE IF NOT EXISTS bos_users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); CREATE TABLE IF NOT EXISTS bos_sessions (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES bos_users(id) ON DELETE CASCADE,token_hash TEXT NOT NULL UNIQUE,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); CREATE INDEX IF NOT EXISTS bos_sessions_user_idx ON bos_sessions(user_id); CREATE INDEX IF NOT EXISTS bos_sessions_expiry_idx ON bos_sessions(expires_at);`);
  return store;
}
function normalizeEmail(email){return String(email||'').trim().toLowerCase()}
function hashPassword(password){return new Promise((resolve,reject)=>{const salt=crypto.randomBytes(16).toString('hex');crypto.scrypt(String(password),salt,64,{N:16384,r:8,p:1},(e,d)=>e?reject(e):resolve(`scrypt$${salt}$${d.toString('hex')}`))})}
function verifyPassword(password,encoded){return new Promise((resolve,reject)=>{const [,salt,hex]=String(encoded||'').split('$');if(!salt||!hex)return resolve(false);crypto.scrypt(String(password),salt,64,{N:16384,r:8,p:1},(e,d)=>{if(e)return reject(e);const stored=Buffer.from(hex,'hex');resolve(stored.length===d.length&&crypto.timingSafeEqual(stored,d))})})}
function hashToken(token){return crypto.createHash('sha256').update(token).digest('hex')}
async function createSession(userId){const store=await ensureAuthSchema();const token=crypto.randomBytes(32).toString('base64url');const id=`session_${crypto.randomUUID()}`;const expires=new Date(Date.now()+SESSION_DAYS*86400000);await store.pool.query('INSERT INTO bos_sessions (id,user_id,token_hash,expires_at) VALUES ($1,$2,$3,$4)',[id,userId,hashToken(token),expires]);return {token,expires}}
async function getSession(token){if(!token)return null;const store=await ensureAuthSchema();const r=await store.pool.query(`SELECT s.id,s.user_id,s.expires_at,u.email,u.name,u.status FROM bos_sessions s JOIN bos_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW() AND u.status='active'`,[hashToken(token)]);return r.rows[0]||null}
async function revokeSession(token){if(!token)return;const store=await ensureAuthSchema();await store.pool.query('DELETE FROM bos_sessions WHERE token_hash=$1',[hashToken(token)])}
async function register({email,password,name}){const normalized=normalizeEmail(email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))throw new Error('VALID_EMAIL_REQUIRED');if(String(password||'').length<8)throw new Error('PASSWORD_MIN_8');if(!String(name||'').trim())throw new Error('NAME_REQUIRED');const store=await ensureAuthSchema();const existing=await store.pool.query('SELECT id FROM bos_users WHERE email=$1',[normalized]);if(existing.rowCount)throw new Error('EMAIL_ALREADY_REGISTERED');const id=`user_${crypto.randomUUID()}`;await store.pool.query('INSERT INTO bos_users (id,email,password_hash,name) VALUES ($1,$2,$3,$4)',[id,normalized,await hashPassword(password),String(name).trim()]);return {id,email:normalized,name:String(name).trim()}}
async function login({email,password}){const normalized=normalizeEmail(email);const store=await ensureAuthSchema();const r=await store.pool.query('SELECT id,email,password_hash,name,status FROM bos_users WHERE email=$1',[normalized]);const user=r.rows[0];if(!user||user.status!=='active'||!(await verifyPassword(password,user.password_hash)))throw new Error('INVALID_CREDENTIALS');return {id:user.id,email:user.email,name:user.name}}
function parseCookies(req){const h=req.headers?.cookie||'';return Object.fromEntries(h.split(';').filter(Boolean).map(p=>{const i=p.indexOf('=');return [p.slice(0,i).trim(),decodeURIComponent(p.slice(i+1).trim())]}))}
function setSessionCookie(res,session){res.setHeader('Set-Cookie',`bos_session=${encodeURIComponent(session.token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS*86400}`)}
function clearSessionCookie(res){res.setHeader('Set-Cookie','bos_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0')}
module.exports={register,login,createSession,getSession,revokeSession,parseCookies,setSessionCookie,clearSessionCookie,normalizeEmail};

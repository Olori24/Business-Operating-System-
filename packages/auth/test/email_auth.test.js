const assert=require('node:assert/strict');const test=require('node:test');

test('email auth exports production primitives',async()=>{const auth=require('../email_auth');for(const name of ['register','login','createSession','getSession','revokeSession','parseCookies','setSessionCookie'])assert.equal(typeof auth[name],'function')});
test('cookie parser extracts BOS session',async()=>{const {parseCookies}=require('../email_auth');const cookies=parseCookies({headers:{cookie:'foo=bar; bos_session=abc123'}});assert.equal(cookies.bos_session,'abc123')});

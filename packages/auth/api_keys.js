const crypto = require('node:crypto');

class ApiKeyStore {
  constructor() { this.keys = new Map(); }

  issue({ tenantId, name, scopes = [] }) {
    if (!tenantId || !name) throw new Error('tenantId and name are required');
    const id = crypto.randomUUID();
    const secret = crypto.randomBytes(24).toString('hex');
    const hash = crypto.createHash('sha256').update(secret).digest('hex');
    const record = { id, tenantId, name, scopes: [...scopes], hash, revoked: false, createdAt: new Date().toISOString() };
    this.keys.set(id, record);
    return { id, tenantId, name, scopes: record.scopes, secret };
  }

  authenticate(secret) {
    const hash = crypto.createHash('sha256').update(secret || '').digest('hex');
    for (const record of this.keys.values()) {
      if (!record.revoked && crypto.timingSafeEqual(Buffer.from(record.hash), Buffer.from(hash))) return { ...record, hash: undefined };
    }
    return null;
  }

  revoke(id) {
    const record = this.keys.get(id);
    if (!record) return false;
    record.revoked = true;
    return true;
  }
}
module.exports = { ApiKeyStore };

const crypto = require('node:crypto');

function keyFromEnv() {
  const raw = process.env.BOS_ENCRYPTION_KEY;
  if (!raw) throw new Error('BOS_ENCRYPTION_KEY_NOT_CONFIGURED');
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('BOS_ENCRYPTION_KEY_INVALID');
  return key;
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFromEnv(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`;
}

function decryptSecret(value) {
  const [ivPart, tagPart, dataPart] = String(value || '').split('.');
  if (!ivPart || !tagPart || !dataPart) throw new Error('INVALID_ENCRYPTED_SECRET');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyFromEnv(), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64url')), decipher.final()]).toString('utf8');
}

module.exports = { encryptSecret, decryptSecret };

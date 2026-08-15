const crypto = require('node:crypto');

class WebhookDelivery {
  sign(payload, secret) {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  build({ eventId, eventType, payload, secret }) {
    if (!eventId || !eventType || payload === undefined || !secret) throw new Error('eventId, eventType, payload and secret are required');
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return { eventId, eventType, body, signature: this.sign(body, secret) };
  }

  verify({ body, signature, secret }) {
    const expected = this.sign(body, secret);
    if (!signature || signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
}
module.exports = { WebhookDelivery };

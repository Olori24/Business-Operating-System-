const assert = require('node:assert/strict');
const test = require('node:test');
const { WebhookDelivery } = require('../webhook_delivery');

test('builds and verifies signed webhook payloads', () => {
  const delivery = new WebhookDelivery();
  const message = delivery.build({ eventId: 'e1', eventType: 'invoice.paid', payload: { amount: 10 }, secret: 'secret' });
  assert.equal(delivery.verify({ body: message.body, signature: message.signature, secret: 'secret' }), true);
  assert.equal(delivery.verify({ body: message.body, signature: message.signature, secret: 'wrong' }), false);
});

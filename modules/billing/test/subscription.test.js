const assert = require('node:assert/strict');
const test = require('node:test');
const { SubscriptionManager } = require('../subscription');

test('starts an idempotent subscription', () => {
  const manager = new SubscriptionManager();
  const first = manager.start({ tenantId: 't1', planId: 'pro', idempotencyKey: 'checkout-1' });
  const second = manager.start({ tenantId: 't1', planId: 'enterprise', idempotencyKey: 'checkout-1' });
  assert.equal(second, first);
  assert.equal(first.planId, 'pro');
});

test('changes plan and cancels safely', () => {
  const manager = new SubscriptionManager();
  const subscription = manager.start({ tenantId: 't1', planId: 'starter' });
  const upgraded = manager.changePlan(subscription, 'pro');
  assert.equal(upgraded.planId, 'pro');
  const canceled = manager.cancel(upgraded);
  assert.equal(canceled.status, 'canceled');
  assert.equal(manager.cancel(canceled), canceled);
});

const assert = require('node:assert/strict');
const test = require('node:test');
const { FailurePolicy } = require('../failure_policy');

test('retries transient failures with exponential backoff', () => {
  const policy = new FailurePolicy({ maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 500 });
  assert.deepEqual(policy.next(1, new Error('network')), { action: 'retry', classification: 'transient', delayMs: 100 });
  assert.deepEqual(policy.next(2, new Error('network')), { action: 'retry', classification: 'transient', delayMs: 200 });
});

test('dead-letters permanent and exhausted failures', () => {
  const policy = new FailurePolicy({ maxAttempts: 2 });
  assert.equal(policy.next(1, { code: 'VALIDATION_ERROR' }).action, 'dead-letter');
  assert.equal(policy.next(2, new Error('network')).action, 'dead-letter');
});

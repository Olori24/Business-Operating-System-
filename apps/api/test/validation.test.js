const assert = require('node:assert/strict');
const test = require('node:test');
const { onboarding, workflow, register, automationRun } = require('../../../packages/validation/schemas');

test('onboarding rejects missing business name', () => {
  assert.throws(() => onboarding({}), error => error.code === 'VALIDATION_FAILED' && error.statusCode === 400);
});

test('register rejects malformed email and short password', () => {
  assert.throws(() => register({ email: 'not-an-email', password: 'short', name: 'A' }), /email must be valid/);
});

test('workflow rejects missing steps', () => {
  assert.throws(() => workflow({ name: 'Sales', trigger: { type: 'manual' } }), /steps must contain 1 to 20 actions/);
});

test('automation requires a workflow id or steps', () => {
  assert.throws(() => automationRun({}), /workflowId or steps is required/);
});

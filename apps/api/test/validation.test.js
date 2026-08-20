const assert = require('node:assert/strict');
const test = require('node:test');
const { onboarding, workflow, register, login, automationRun, whatsappConnect, webhook } = require('../../../packages/validation/schemas');

function assertValidationFailure(fn) {
  assert.throws(fn, error => error.code === 'VALIDATION_FAILED' && error.statusCode === 400);
}

test('onboarding rejects missing business name', () => {
  assertValidationFailure(() => onboarding({}));
});

test('register rejects malformed email and short password', () => {
  assert.throws(() => register({ email: 'not-an-email', password: 'short', name: 'A' }), /email must be valid/);
});

test('login rejects missing credentials', () => {
  assertValidationFailure(() => login({ email: 'user@example.com' }));
});

test('workflow rejects missing steps', () => {
  assertValidationFailure(() => workflow({ name: 'Sales', trigger: { type: 'manual' } }));
});

test('workflow rejects malformed step input', () => {
  assertValidationFailure(() => workflow({ name: 'Sales', trigger: { type: 'manual' }, steps: [{ action: 'create_task', input: 'bad' }] }));
});

test('automation requires a workflow id or steps', () => {
  assertValidationFailure(() => automationRun({}));
});

test('automation reuses workflow schema for runtime steps', () => {
  assertValidationFailure(() => automationRun({ steps: [{ input: {} }] }));
});

test('WhatsApp connect rejects missing credentials', () => {
  assertValidationFailure(() => whatsappConnect({ phoneNumberId: '123' }));
});

test('webhook rejects missing entry array', () => {
  assertValidationFailure(() => webhook({ object: 'whatsapp_business_account' }));
});

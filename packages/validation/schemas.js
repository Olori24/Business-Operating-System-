const VALIDATION_FAILED = 'VALIDATION_FAILED';

/** @param {string} message @param {string|null} [field] @returns {TypeError} */
function failure(message, field = null) {
  const error = new TypeError(message);
  error.code = VALIDATION_FAILED;
  error.statusCode = 400;
  error.field = field;
  return error;
}

/** @param {unknown} value @param {string} name @returns {Record<string, any>} */
function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw failure(`${name} must be an object`, name);
  return /** @type {Record<string, any>} */ (value);
}

/** @param {unknown} value @param {string} field @param {{max?: number}} [options] @returns {string} */
function requiredString(value, field, { max = 500 } = {}) {
  if (typeof value !== 'string' || !value.trim()) throw failure(`${field} is required`, field);
  const clean = value.trim();
  if (clean.length > max) throw failure(`${field} exceeds maximum length`, field);
  return clean;
}

/** @param {unknown} value @param {string} field @returns {Record<string, any>|undefined} */
function optionalObject(value, field) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw failure(`${field} must be an object`, field);
  return /** @type {Record<string, any>} */ (value);
}

/** @param {unknown} payload @returns {{email: string, password: string, name: string}} */
function register(payload) {
  const body = object(payload, 'body');
  const email = requiredString(body.email, 'email', { max: 320 }).toLowerCase();
  const password = requiredString(body.password, 'password', { max: 200 });
  const name = requiredString(body.name, 'name', { max: 120 });
  if (!/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(email)) throw failure('email must be valid', 'email');
  if (password.length < 8) throw failure('password must contain at least 8 characters', 'password');
  return { email, password, name };
}

/** @param {unknown} payload @returns {{email: string, password: string}} */
function login(payload) {
  const body = object(payload, 'body');
  return {
    email: requiredString(body.email, 'email', { max: 320 }).toLowerCase(),
    password: requiredString(body.password, 'password', { max: 200 }),
  };
}

/** @param {unknown} payload @returns {{businessName: string}} */
function onboarding(payload) {
  const body = object(payload, 'body');
  return { businessName: requiredString(body.businessName || body.business_name, 'businessName', { max: 160 }) };
}

/** @param {unknown} payload @returns {{name: string, trigger: {type: string}, steps: Array<{action: string, input: Record<string, any>}>, enabled: boolean}} */
function workflow(payload) {
  const body = object(payload, 'body');
  const name = requiredString(body.name, 'name', { max: 120 });
  const trigger = object(body.trigger, 'trigger');
  const triggerType = requiredString(trigger.type, 'trigger.type', { max: 80 });
  if (!Array.isArray(body.steps) || body.steps.length < 1 || body.steps.length > 20) throw failure('steps must contain 1 to 20 actions', 'steps');
  const steps = body.steps.map((step, index) => {
    const item = object(step, `steps[${index}]`);
    const action = requiredString(item.action, `steps[${index}].action`, { max: 120 });
    const input = optionalObject(item.input, `steps[${index}].input`);
    return { action, input: input || {} };
  });
  return { name, trigger: { type: triggerType }, steps, enabled: body.enabled !== false };
}

/** @param {unknown} payload @returns {{workflowId?: string, steps?: Array<{action: string, input: Record<string, any>}>, context: Record<string, any>}} */
function automationRun(payload) {
  const body = object(payload, 'body');
  const workflowId = body.workflowId === undefined ? undefined : requiredString(body.workflowId, 'workflowId', { max: 160 });
  const context = body.context === undefined ? {} : optionalObject(body.context, 'context');
  const steps = body.steps === undefined ? undefined : workflow({ name: 'runtime', trigger: { type: 'manual' }, steps: body.steps }).steps;
  if (!workflowId && !steps) throw failure('workflowId or steps is required');
  return { workflowId, steps, context: context || {} };
}

/** @param {unknown} payload @returns {{phoneNumberId: string, accessToken: string}} */
function whatsappConnect(payload) {
  const body = object(payload, 'body');
  return {
    phoneNumberId: requiredString(body.phoneNumberId, 'phoneNumberId', { max: 160 }),
    accessToken: requiredString(body.accessToken, 'accessToken', { max: 4096 }),
  };
}

/** @param {unknown} payload @returns {Record<string, any>} */
function webhook(payload) {
  const body = object(payload, 'body');
  if (!body.object) throw failure('object is required', 'object');
  if (!Array.isArray(body.entry)) throw failure('entry must be an array', 'entry');
  return body;
}

module.exports = { VALIDATION_FAILED, register, login, onboarding, workflow, automationRun, whatsappConnect, webhook };

const assert = require('node:assert/strict');
const test = require('node:test');
const { EmployeeRuntime } = require('../employee_runtime');

test('executes an authorized employee request and audits lifecycle', async () => {
  const events = [];
  const runtime = new EmployeeRuntime({
    policy: { authorize: async () => true },
    audit: async event => events.push(event),
    executor: async request => ({ ok: true, objective: request.objective })
  });
  const result = await runtime.run({ employeeId: 'agent-1', tenantId: 'tenant-1', objective: 'qualify leads' });
  assert.deepEqual(result, { ok: true, objective: 'qualify leads' });
  assert.deepEqual(events.map(event => event.type), ['employee.execution.started', 'employee.execution.completed']);
});

test('denies unauthorized execution before executor runs', async () => {
  let executed = false;
  const runtime = new EmployeeRuntime({
    policy: { authorize: async () => false },
    executor: async () => { executed = true; }
  });
  await assert.rejects(() => runtime.run({ employeeId: 'agent-1', tenantId: 'tenant-1', objective: 'send money' }), /denied by policy/);
  assert.equal(executed, false);
});

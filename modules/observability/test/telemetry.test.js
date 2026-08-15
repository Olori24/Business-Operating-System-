const assert = require('node:assert/strict');
const test = require('node:test');
const { Telemetry } = require('../telemetry');

test('records structured execution telemetry without mutating source fields', () => {
  const telemetry = new Telemetry({ clock: () => '2026-01-01T00:00:00.000Z' });
  const entry = telemetry.record('execution.completed', { tenantId: 't1', executionId: 'e1', status: 'completed' });
  assert.deepEqual(entry, { timestamp: '2026-01-01T00:00:00.000Z', event: 'execution.completed', tenantId: 't1', executionId: 'e1', status: 'completed' });
  assert.equal(telemetry.snapshot().length, 1);
});

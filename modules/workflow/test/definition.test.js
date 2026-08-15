const assert = require('node:assert/strict');
const test = require('node:test');
const { validateWorkflow } = require('../definition');

test('validates a canonical workflow graph', () => {
  const workflow = validateWorkflow({
    id: 'wf-1',
    nodes: [{ id: 'trigger', type: 'trigger' }, { id: 'action', type: 'action' }],
    edges: [{ from: 'trigger', to: 'action' }]
  });
  assert.equal(workflow.id, 'wf-1');
});

test('rejects malformed workflow graphs', () => {
  assert.throws(() => validateWorkflow({ id: 'wf-1', nodes: [], edges: [] }), /WORKFLOW_TRIGGER_REQUIRED/);
  assert.throws(() => validateWorkflow({ id: 'wf-1', nodes: [{ id: 'a', type: 'action' }], edges: [] }), /WORKFLOW_TRIGGER_REQUIRED/);
  assert.throws(() => validateWorkflow({ id: 'wf-1', nodes: [{ id: 't', type: 'trigger' }], edges: [{ from: 't', to: 'x' }] }), /INVALID_WORKFLOW_EDGE/);
});

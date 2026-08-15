const assert = require('node:assert/strict');
const test = require('node:test');
const { WorkflowVersionStore } = require('../versioning');

test('creates versions and publishes a selected version', () => {
  const store = new WorkflowVersionStore();
  const first = store.save({ id: 'wf-1', nodes: [], edges: [] });
  const second = store.save({ id: 'wf-1', nodes: [{ id: 't', type: 'trigger' }], edges: [] });
  assert.equal(first.version, 1);
  assert.equal(second.version, 2);
  assert.equal(store.publish('wf-1', 1).version, 1);
  assert.equal(store.current('wf-1').version, 1);
});

test('rejects an unknown version', () => {
  const store = new WorkflowVersionStore();
  store.save({ id: 'wf-1', nodes: [], edges: [] });
  assert.throws(() => store.publish('wf-1', 9), /WORKFLOW_VERSION_NOT_FOUND/);
});

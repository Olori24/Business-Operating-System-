const assert = require('node:assert/strict');
const test = require('node:test');
const { AgentExecutionPipeline } = require('../execution_pipeline');

test('plans, executes and verifies every run', async () => {
  const pipeline = new AgentExecutionPipeline({ planner: async () => ['a', 'b'], executor: async step => step.toUpperCase(), verifier: async ({ results }) => ({ ok: results.join('') === 'AB' }) });
  const result = await pipeline.run({ objective: 'demo' });
  assert.deepEqual(result.results, ['A', 'B']);
});

test('blocks unverified execution', async () => {
  const pipeline = new AgentExecutionPipeline({ planner: async () => ['a'], executor: async () => 'bad', verifier: async () => ({ ok: false, reason: 'failed check' }) });
  await assert.rejects(() => pipeline.run({}), /failed check/);
});

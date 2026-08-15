const test = require('node:test');
const assert = require('node:assert/strict');
const { DistributedWorkerRuntime } = require('../worker_runtime');

test('worker runtime claims, handles and completes work', async () => {
  const calls = [];
  const queue = {
    async claim(id, workerId) { calls.push(['claim', id, workerId]); return { id }; },
    async complete(id, workerId) { calls.push(['complete', id, workerId]); }
  };
  const worker = new DistributedWorkerRuntime({ queue, workerId: 'w1', handler: async (item, workerId) => calls.push(['handle', item.id, workerId]) });
  assert.equal(await worker.process('task-1'), true);
  assert.deepEqual(calls, [['claim', 'task-1', 'w1'], ['handle', 'task-1', 'w1'], ['complete', 'task-1', 'w1']]);
});

test('worker runtime renews leases while work is active', async () => {
  const calls = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const queue = {
    async claim(id, workerId) { calls.push(['claim', id, workerId]); return { id }; },
    async heartbeat(id, workerId) { calls.push(['heartbeat', id, workerId]); },
    async complete(id, workerId) { calls.push(['complete', id, workerId]); }
  };
  const worker = new DistributedWorkerRuntime({ queue, workerId: 'w-heartbeat', heartbeatIntervalMs: 5, handler: async () => gate });
  const run = worker.process('task-heartbeat');
  await new Promise((resolve) => setTimeout(resolve, 15));
  release();
  await run;
  assert.ok(calls.filter(([type]) => type === 'heartbeat').length >= 1);
});

test('worker runtime retries failed work and releases its slot', async () => {
  const calls = [];
  const queue = {
    async claim(id) { return { id }; },
    async retry(id, workerId) { calls.push(['retry', id, workerId]); }
  };
  const worker = new DistributedWorkerRuntime({ queue, workerId: 'w2', handler: async () => { throw new Error('boom'); } });
  await assert.rejects(() => worker.process('task-2'), /boom/);
  assert.equal(worker.active, 0);
  assert.deepEqual(calls, [['retry', 'task-2', 'w2']]);
});

test('worker runtime enforces concurrency limit', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let handled = 0;
  const queue = { async claim(id) { return { id }; }, async complete() {} };
  const worker = new DistributedWorkerRuntime({ queue, workerId: 'w3', concurrency: 1, handler: async () => { handled += 1; await gate; } });
  const first = worker.process('task-3');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(await worker.process('task-4'), false);
  release();
  assert.equal(await first, true);
  assert.equal(handled, 1);
});

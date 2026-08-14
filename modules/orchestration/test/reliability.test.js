const assert = require('node:assert/strict');
const test = require('node:test');
const { OrchestrationReliability } = require('../reliability');

test('retries a failed operation until it succeeds', async () => {
  let attempts = 0;
  const reliability = new OrchestrationReliability({ maxAttempts: 3 });
  const result = await reliability.execute(async ({ attempt }) => {
    attempts += 1;
    if (attempt < 3) throw new Error('TRANSIENT_FAILURE');
    return 'ok';
  });

  assert.equal(result, 'ok');
  assert.equal(attempts, 3);
});

test('stops after max attempts and reports terminal failure', async () => {
  let attempts = 0;
  let failure;
  const reliability = new OrchestrationReliability({
    maxAttempts: 2,
    onFailure: async (value) => { failure = value; }
  });

  await assert.rejects(
    reliability.execute(async () => {
      attempts += 1;
      throw new Error('PERMANENT_FAILURE');
    }),
    /PERMANENT_FAILURE/
  );

  assert.equal(attempts, 2);
  assert.equal(failure.attempts, 2);
  assert.equal(failure.error.message, 'PERMANENT_FAILURE');
});

test('passes execution context and attempt number', async () => {
  const reliability = new OrchestrationReliability({ maxAttempts: 1 });
  const result = await reliability.execute(async (context) => context, { taskId: 'task-1' });
  assert.equal(result.taskId, 'task-1');
  assert.equal(result.attempt, 1);
});

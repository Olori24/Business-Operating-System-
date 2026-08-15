class AgentExecutionPipeline {
  constructor({ planner, executor, verifier }) {
    if (![planner, executor, verifier].every(fn => typeof fn === 'function')) throw new TypeError('planner, executor and verifier are required');
    this.planner = planner; this.executor = executor; this.verifier = verifier;
  }
  async run(input) {
    const plan = await this.planner(input);
    if (!Array.isArray(plan) || plan.length === 0) throw new Error('planner returned no executable steps');
    const results = [];
    for (const step of plan) results.push(await this.executor(step, input));
    const verification = await this.verifier({ input, plan, results });
    if (!verification?.ok) throw new Error(verification?.reason || 'execution verification failed');
    return { plan, results, verification };
  }
}
module.exports = { AgentExecutionPipeline };

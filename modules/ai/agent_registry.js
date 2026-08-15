class AgentRegistry {
  constructor() { this.agents = new Map(); }
  register({ id, tenantId, name, tools = [], permissions = [] }) {
    if (!id || !tenantId || !name) throw new TypeError('id, tenantId and name are required');
    if (this.agents.has(`${tenantId}:${id}`)) throw new Error('agent already registered');
    const agent = Object.freeze({ id, tenantId, name, tools: [...tools], permissions: [...permissions] });
    this.agents.set(`${tenantId}:${id}`, agent);
    return agent;
  }
  get({ tenantId, id }) { return this.agents.get(`${tenantId}:${id}`) ?? null; }
  canUseTool({ tenantId, id, tool }) {
    const agent = this.get({ tenantId, id });
    return Boolean(agent && agent.tools.includes(tool));
  }
}
module.exports = { AgentRegistry };

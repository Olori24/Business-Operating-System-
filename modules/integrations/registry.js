class IntegrationRegistry {
  constructor() { this.adapters = new Map(); }
  register({ name, execute, health }) { if (!name || typeof execute !== 'function') throw new Error('name and execute are required'); this.adapters.set(name, { name, execute, health }); }
  get(name) { return this.adapters.get(name) ?? null; }
  list() { return [...this.adapters.keys()]; }
}
module.exports = { IntegrationRegistry };

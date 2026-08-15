class IntegrationRegistry {
  constructor() { this.adapters = new Map(); }

  register({ name, execute, health, authenticate = null, actions = [], triggers = [] }) {
    if (!name || typeof execute !== 'function') throw new Error('name and execute are required');
    if (authenticate !== null && typeof authenticate !== 'function') throw new Error('INVALID_AUTHENTICATE');
    this.adapters.set(name, Object.freeze({ name, execute, health, authenticate, actions: [...actions], triggers: [...triggers] }));
  }

  get(name) { return this.adapters.get(name) ?? null; }
  list() { return [...this.adapters.keys()]; }

  async invoke(name, action, payload, context = {}) {
    const adapter = this.get(name);
    if (!adapter) throw new Error('INTEGRATION_NOT_FOUND');
    if (adapter.actions.length && !adapter.actions.includes(action)) throw new Error('ACTION_NOT_SUPPORTED');
    return adapter.execute({ action, payload, context });
  }
}

module.exports = { IntegrationRegistry };

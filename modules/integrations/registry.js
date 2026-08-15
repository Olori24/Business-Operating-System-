class IntegrationRegistry {
  constructor() { this.adapters = new Map(); }

  register({ name, version = '1.0.0', execute, health = null, authenticate = null, actions = [], triggers = [] }) {
    if (!name || typeof execute !== 'function') throw new Error('name and execute are required');
    if (authenticate !== null && typeof authenticate !== 'function') throw new Error('INVALID_AUTHENTICATE');
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('INVALID_VERSION');
    if (this.adapters.has(name)) throw new Error('INTEGRATION_ALREADY_REGISTERED');
    this.adapters.set(name, Object.freeze({ name, version, execute, health, authenticate, actions: [...actions], triggers: [...triggers] }));
  }

  get(name) { return this.adapters.get(name) ?? null; }
  list() { return [...this.adapters.values()].map(({ name, version }) => ({ name, version })); }

  async invoke(name, action, payload, context = {}) {
    if (!context.tenantId) throw new Error('TENANT_CONTEXT_REQUIRED');
    const adapter = this.get(name);
    if (!adapter) throw new Error('INTEGRATION_NOT_FOUND');
    if (adapter.actions.length && !adapter.actions.includes(action)) throw new Error('ACTION_NOT_SUPPORTED');
    return adapter.execute({ action, payload, context: { ...context, tenantId: context.tenantId } });
  }

  async health(name) {
    const adapter = this.get(name);
    if (!adapter) throw new Error('INTEGRATION_NOT_FOUND');
    return typeof adapter.health === 'function' ? adapter.health() : { status: 'unknown' };
  }
}

module.exports = { IntegrationRegistry };

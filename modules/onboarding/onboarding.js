class Onboarding {
  constructor() {
    this.workspaces = new Map();
  }

  createWorkspace({ tenantId, ownerId, businessName, idempotencyKey = null }) {
    if (!tenantId || !ownerId || !businessName) throw new Error('tenantId, ownerId and businessName are required');
    const key = idempotencyKey ? `${tenantId}:${idempotencyKey}` : null;
    if (key && this.workspaces.has(key)) return this.workspaces.get(key);

    const workspace = {
      tenantId,
      ownerId,
      businessName: businessName.trim(),
      status: 'active',
      onboarding: 'started',
      template: null,
      createdAt: new Date().toISOString()
    };
    if (!workspace.businessName) throw new Error('businessName is required');
    if (key) this.workspaces.set(key, workspace);
    return workspace;
  }

  complete(workspace, { template = null } = {}) {
    if (!workspace || !workspace.tenantId) throw new Error('workspace is required');
    if (workspace.onboarding === 'completed') return workspace;
    return { ...workspace, template, onboarding: 'completed' };
  }
}

module.exports = { Onboarding };

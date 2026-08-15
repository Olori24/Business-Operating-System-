class Onboarding {
  createWorkspace({ tenantId, ownerId, businessName }) {
    if (!tenantId || !ownerId || !businessName) throw new Error('tenantId, ownerId and businessName are required');
    return { tenantId, ownerId, businessName, status: 'active', onboarding: 'started' };
  }

  complete(workspace, { template = null } = {}) {
    return { ...workspace, template, onboarding: 'completed' };
  }
}
module.exports = { Onboarding };

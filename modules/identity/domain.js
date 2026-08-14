const ROLE_VALUES = Object.freeze(['owner', 'admin', 'member']);

function createOrganization({ id, name, slug }) {
  if (!id || !name || !slug) throw new TypeError('Organization requires id, name, and slug');
  return Object.freeze({ id, name, slug, type: 'organization' });
}

function createUser({ id, email, name }) {
  if (!id || !email || !name) throw new TypeError('User requires id, email, and name');
  return Object.freeze({ id, email, name, type: 'user' });
}

function createRoleAssignment({ organizationId, userId, role }) {
  if (!organizationId || !userId) throw new TypeError('Role assignment requires organizationId and userId');
  if (!ROLE_VALUES.includes(role)) throw new TypeError(`Unsupported role: ${role}`);
  return Object.freeze({ organizationId, userId, role, type: 'role_assignment' });
}

function createWorkspace({ id, organizationId, name }) {
  if (!id || !organizationId || !name) throw new TypeError('Workspace requires id, organizationId, and name');
  return Object.freeze({ id, organizationId, name, type: 'workspace' });
}

module.exports = {
  ROLE_VALUES,
  createOrganization,
  createUser,
  createRoleAssignment,
  createWorkspace,
};

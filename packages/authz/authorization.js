const ROLES = Object.freeze({
  owner: Object.freeze(['organization:read', 'organization:write', 'workspace:read', 'workspace:write', 'members:read', 'members:write']),
  admin: Object.freeze(['organization:read', 'organization:write', 'workspace:read', 'workspace:write', 'members:read', 'members:write']),
  member: Object.freeze(['organization:read', 'workspace:read', 'workspace:write']),
});

function permissionsFor(role) {
  if (!ROLES[role]) throw new Error(`Unknown role: ${role}`);
  return new Set(ROLES[role]);
}

function authorize({ role, permission, organizationId, resourceOrganizationId }) {
  if (!organizationId || !resourceOrganizationId || organizationId !== resourceOrganizationId) {
    return false;
  }
  return permissionsFor(role).has(permission);
}

function assertAuthorized(context) {
  if (!authorize(context)) {
    const error = new Error('Forbidden');
    error.code = 'FORBIDDEN';
    throw error;
  }
  return true;
}

module.exports = { ROLES, permissionsFor, authorize, assertAuthorized };

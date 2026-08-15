function evaluatePolicy({ role, permission, organizationId, resourceOrganizationId, highRisk = false, approval = false } = {}) {
  if (!role || !permission || !organizationId || !resourceOrganizationId) return { allowed: false, reason: 'MISSING_AUTHORIZATION_CONTEXT' };
  if (organizationId !== resourceOrganizationId) return { allowed: false, reason: 'TENANT_BOUNDARY_VIOLATION' };
  if (highRisk && !approval) return { allowed: false, reason: 'APPROVAL_REQUIRED' };
  const permissions = ROLE_PERMISSIONS[role] || [];
  if (!permissions.includes(permission)) return { allowed: false, reason: 'FORBIDDEN' };
  return { allowed: true, reason: 'AUTHORIZED' };
}

const ROLE_PERMISSIONS = Object.freeze({
  owner: Object.freeze(['organization:read', 'organization:write', 'workspace:read', 'workspace:write', 'members:read', 'members:write']),
  admin: Object.freeze(['organization:read', 'organization:write', 'workspace:read', 'workspace:write', 'members:read', 'members:write']),
  member: Object.freeze(['organization:read', 'workspace:read', 'workspace:write'])
});

module.exports = { evaluatePolicy, ROLE_PERMISSIONS };

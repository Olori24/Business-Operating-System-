class OrganizationDirectory {
  constructor() { this.organizations = new Map(); }
  create({ id, tenantId, name }) { if (!id || !tenantId || !name) throw new Error('id, tenantId and name are required'); const org = { id, tenantId, name, members: new Map() }; this.organizations.set(id, org); return org; }
  addMember(orgId, { userId, role = 'member' }) { const org = this.organizations.get(orgId); if (!org) throw new Error('Organization not found'); org.members.set(userId, role); return { userId, role }; }
  role(orgId, userId) { return this.organizations.get(orgId)?.members.get(userId) ?? null; }
}
module.exports = { OrganizationDirectory };

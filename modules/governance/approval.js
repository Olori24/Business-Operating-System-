const TERMINAL = new Set(['approved', 'rejected', 'cancelled']);

class ApprovalGate {
  constructor() { this.requests = new Map(); }

  request({ id, tenantId, action, requesterId }) {
    if (!id || !tenantId || !action || !requesterId) throw new Error('INVALID_APPROVAL_REQUEST');
    if (this.requests.has(id)) throw new Error('APPROVAL_EXISTS');
    const request = { id, tenantId, action, requesterId, status: 'pending', createdAt: new Date().toISOString() };
    this.requests.set(id, request);
    return { ...request };
  }

  decide({ id, tenantId, approverId, decision }) {
    const request = this.requests.get(id);
    if (!request) throw new Error('APPROVAL_NOT_FOUND');
    if (request.tenantId !== tenantId) throw new Error('TENANT_BOUNDARY_VIOLATION');
    if (request.requesterId === approverId) throw new Error('SELF_APPROVAL_FORBIDDEN');
    if (!['approved', 'rejected'].includes(decision)) throw new Error('INVALID_APPROVAL_DECISION');
    if (TERMINAL.has(request.status)) throw new Error('APPROVAL_TERMINAL');
    const updated = { ...request, status: decision, approverId, decidedAt: new Date().toISOString() };
    this.requests.set(id, updated);
    return { ...updated };
  }

  get(id) { return this.requests.get(id) ? { ...this.requests.get(id) } : null; }
}

module.exports = { ApprovalGate };

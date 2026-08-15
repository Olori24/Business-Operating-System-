class ApprovalGate {
  constructor() { this.pending = new Map(); }
  request({ id, tenantId, action, requestedBy }) {
    if (!id || !tenantId || !action || !requestedBy) throw new TypeError('approval fields are required');
    const record = Object.freeze({ id, tenantId, action, requestedBy, status: 'pending' });
    this.pending.set(`${tenantId}:${id}`, record);
    return record;
  }
  decide({ tenantId, id, approver, approved }) {
    const key = `${tenantId}:${id}`; const record = this.pending.get(key);
    if (!record) throw new Error('approval not found');
    if (record.requestedBy === approver) throw new Error('requester cannot approve own action');
    const next = Object.freeze({ ...record, status: approved ? 'approved' : 'rejected', approver });
    this.pending.set(key, next); return next;
  }
}
module.exports = { ApprovalGate };

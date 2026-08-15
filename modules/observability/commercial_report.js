class CommercialReport {
  summarize({ tenantId, events = [], usage = {} }) {
    if (!tenantId) throw new Error('tenantId is required');
    const tenantEvents = events.filter(event => event.tenantId === tenantId);
    const statusCounts = {};
    for (const event of tenantEvents) statusCounts[event.status || 'unknown'] = (statusCounts[event.status || 'unknown'] || 0) + 1;
    return { tenantId, eventCount: tenantEvents.length, statusCounts, usage: { ...usage } };
  }

  auditEntry({ tenantId, actorId, action, resourceType, resourceId, metadata = {} }) {
    if (!tenantId || !actorId || !action || !resourceType || !resourceId) throw new Error('complete audit identity is required');
    return { tenantId, actorId, action, resourceType, resourceId, metadata: { ...metadata }, occurredAt: new Date().toISOString() };
  }
}
module.exports = { CommercialReport };

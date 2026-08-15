const ACTIVE_STATUSES = new Set(['trialing', 'active', 'past_due']);

class SubscriptionManager {
  constructor() { this.subscriptions = new Map(); }

  start({ tenantId, planId, status = 'trialing', idempotencyKey = null }) {
    if (!tenantId || !planId) throw new Error('tenantId and planId are required');
    if (!ACTIVE_STATUSES.has(status)) throw new Error('invalid subscription status');
    const key = idempotencyKey ? `${tenantId}:${idempotencyKey}` : `${tenantId}:subscription`;
    if (this.subscriptions.has(key)) return this.subscriptions.get(key);
    const subscription = { tenantId, planId, status, createdAt: new Date().toISOString() };
    this.subscriptions.set(key, subscription);
    return subscription;
  }

  changePlan(subscription, planId) {
    if (!subscription || !subscription.tenantId) throw new Error('subscription is required');
    if (!planId) throw new Error('planId is required');
    return { ...subscription, planId, changedAt: new Date().toISOString() };
  }

  cancel(subscription) {
    if (!subscription || !subscription.tenantId) throw new Error('subscription is required');
    if (subscription.status === 'canceled') return subscription;
    return { ...subscription, status: 'canceled', canceledAt: new Date().toISOString() };
  }
}

module.exports = { SubscriptionManager };

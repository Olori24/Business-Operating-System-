class QueueWorkerEngine {
  constructor({ repository, workflowEngine, eventBus = null, leaseMs = 30000 }) {
    if (!repository || !workflowEngine) throw new TypeError('QueueWorkerEngine requires repository and workflowEngine');
    if (!Number.isInteger(leaseMs) || leaseMs < 1) throw new TypeError('leaseMs must be a positive integer');
    this.repository = repository;
    this.workflowEngine = workflowEngine;
    this.eventBus = eventBus;
    this.leaseMs = leaseMs;
    this.unsubscribe = null;
    if (eventBus) this.unsubscribe = eventBus.subscribe('task.completed', (event) => this.handleTaskCompleted(event));
  }

  async enqueue(taskId, processId) {
    const task = await this.repository.find('task', taskId);
    if (!task || task.processId !== processId) throw new Error('TASK_NOT_FOUND');
    const existing = await this.repository.find('queue', taskId);
    if (existing && ['queued', 'processing'].includes(existing.status)) return existing;
    return this.repository.save('queue', taskId, {
      id: taskId, processId, status: 'queued', attempts: 0,
      workerId: null, leaseExpiresAt: null
    });
  }

  async handleTaskCompleted(event) {
    if (!event || !event.nextTaskId) return null;
    if (!event.processId) throw new Error('PROCESS_ID_REQUIRED');
    return this.enqueue(event.nextTaskId, event.processId);
  }

  async claim(taskId, workerId, leaseMs = this.leaseMs) {
    if (!workerId) throw new TypeError('workerId is required');
    const item = await this.repository.find('queue', taskId);
    if (!item) throw new Error('QUEUE_ITEM_NOT_FOUND');
    const now = Date.now();
    const expired = item.status === 'processing' && item.leaseExpiresAt && item.leaseExpiresAt <= now;
    if (item.status !== 'queued' && !expired) throw new Error('QUEUE_ITEM_NOT_CLAIMABLE');
    item.status = 'processing';
    item.attempts = (item.attempts || 0) + 1;
    item.workerId = workerId;
    item.leaseExpiresAt = now + leaseMs;
    return this.repository.save('queue', taskId, item);
  }

  async heartbeat(taskId, workerId, leaseMs = this.leaseMs) {
    const item = await this.repository.find('queue', taskId);
    if (!item) throw new Error('QUEUE_ITEM_NOT_FOUND');
    if (item.status !== 'processing' || item.workerId !== workerId) throw new Error('LEASE_NOT_OWNED');
    item.leaseExpiresAt = Date.now() + leaseMs;
    return this.repository.save('queue', taskId, item);
  }

  async complete(taskId, workerId) {
    const item = await this.repository.find('queue', taskId);
    if (!item) throw new Error('QUEUE_ITEM_NOT_FOUND');
    if (item.status !== 'processing') throw new Error('QUEUE_ITEM_NOT_COMPLETABLE');
    if (workerId && item.workerId !== workerId) throw new Error('LEASE_NOT_OWNED');
    if (item.leaseExpiresAt && item.leaseExpiresAt <= Date.now()) throw new Error('LEASE_EXPIRED');
    await this.workflowEngine.completeTask({ taskId, processId: item.processId });
    item.status = 'completed';
    item.workerId = null;
    item.leaseExpiresAt = null;
    return this.repository.save('queue', taskId, item);
  }

  async retry(taskId, workerId) {
    const item = await this.repository.find('queue', taskId);
    if (!item) throw new Error('QUEUE_ITEM_NOT_FOUND');
    if (item.status !== 'processing') throw new Error('QUEUE_ITEM_NOT_RETRYABLE');
    if (workerId && item.workerId !== workerId) throw new Error('LEASE_NOT_OWNED');
    item.status = 'queued';
    item.workerId = null;
    item.leaseExpiresAt = null;
    return this.repository.save('queue', taskId, item);
  }

  async reclaimExpired() {
    const items = await this.repository.all('queue');
    const now = Date.now();
    const reclaimed = [];
    for (const item of items) {
      if (item.status === 'processing' && item.leaseExpiresAt && item.leaseExpiresAt <= now) {
        item.status = 'queued';
        item.workerId = null;
        item.leaseExpiresAt = null;
        reclaimed.push(await this.repository.save('queue', item.id, item));
      }
    }
    return reclaimed;
  }
}

module.exports = { QueueWorkerEngine };

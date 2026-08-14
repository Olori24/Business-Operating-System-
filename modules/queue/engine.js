class QueueWorkerEngine {
  constructor({ repository, workflowEngine, eventBus = null }) {
    if (!repository || !workflowEngine) throw new TypeError('QueueWorkerEngine requires repository and workflowEngine');
    this.repository = repository;
    this.workflowEngine = workflowEngine;
    this.eventBus = eventBus;
    this.unsubscribe = null;
    if (eventBus) {
      this.unsubscribe = eventBus.subscribe('task.completed', (event) => this.handleTaskCompleted(event));
    }
  }

  async enqueue(taskId, processId) {
    const task = await this.repository.find('task', taskId);
    if (!task || task.processId !== processId) throw new Error('TASK_NOT_FOUND');
    const existing = await this.repository.find('queue', taskId);
    if (existing && ['queued', 'processing'].includes(existing.status)) return existing;
    return this.repository.save('queue', taskId, { id: taskId, processId, status: 'queued', attempts: 0 });
  }

  async handleTaskCompleted(event) {
    if (!event || !event.nextTaskId) return null;
    if (!event.processId) throw new Error('PROCESS_ID_REQUIRED');
    return this.enqueue(event.nextTaskId, event.processId);
  }

  async claim(taskId) {
    const item = await this.repository.find('queue', taskId);
    if (!item) throw new Error('QUEUE_ITEM_NOT_FOUND');
    if (item.status !== 'queued') throw new Error('QUEUE_ITEM_NOT_CLAIMABLE');
    item.status = 'processing';
    item.attempts += 1;
    return this.repository.save('queue', taskId, item);
  }

  async complete(taskId) {
    const item = await this.repository.find('queue', taskId);
    if (!item) throw new Error('QUEUE_ITEM_NOT_FOUND');
    if (item.status !== 'processing') throw new Error('QUEUE_ITEM_NOT_COMPLETABLE');
    await this.workflowEngine.completeTask({ taskId, processId: item.processId });
    item.status = 'completed';
    return this.repository.save('queue', taskId, item);
  }

  async retry(taskId) {
    const item = await this.repository.find('queue', taskId);
    if (!item) throw new Error('QUEUE_ITEM_NOT_FOUND');
    if (item.status !== 'processing') throw new Error('QUEUE_ITEM_NOT_RETRYABLE');
    item.status = 'queued';
    return this.repository.save('queue', taskId, item);
  }
}

module.exports = { QueueWorkerEngine };

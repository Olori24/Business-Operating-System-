class QueueWorkerEngine {
  constructor({ repository, workflowEngine }) {
    if (!repository || !workflowEngine) throw new TypeError('QueueWorkerEngine requires repository and workflowEngine');
    this.repository = repository;
    this.workflowEngine = workflowEngine;
  }

  async enqueue(taskId, processId) {
    const task = await this.repository.find('task', taskId);
    if (!task || task.processId !== processId) throw new Error('TASK_NOT_FOUND');
    const existing = await this.repository.find('queue', taskId);
    if (existing && ['queued', 'processing'].includes(existing.status)) return existing;
    return this.repository.save('queue', taskId, { id: taskId, processId, status: 'queued', attempts: 0 });
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
    await this.workflowEngine.completeTask(taskId, item.processId);
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

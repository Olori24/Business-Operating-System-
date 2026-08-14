const VALID_STATUSES = new Set(['pending', 'in_progress', 'completed']);

class WorkflowEngine {
  constructor({ repository, eventBus = null }) {
    if (!repository) throw new TypeError('WorkflowEngine requires a repository');
    this.repository = repository;
    this.eventBus = eventBus;
  }

  async publish(event) {
    if (this.eventBus) await this.eventBus.publish(event);
  }

  async startTask({ taskId, processId }) {
    const task = await this.repository.find('task', taskId);
    if (!task) throw new Error('TASK_NOT_FOUND');
    if (task.processId !== processId) throw new Error('PROCESS_BOUNDARY_VIOLATION');
    if (task.status === 'completed') throw new Error('TASK_ALREADY_COMPLETED');

    const updated = { ...task, status: 'in_progress' };
    const result = await this.repository.save('task', task.id, updated);
    await this.publish({
      type: 'task.started',
      taskId: result.id,
      processId: result.processId,
      status: result.status
    });
    return result;
  }

  async completeTask({ taskId, processId }) {
    const task = await this.repository.find('task', taskId);
    if (!task) throw new Error('TASK_NOT_FOUND');
    if (task.processId !== processId) throw new Error('PROCESS_BOUNDARY_VIOLATION');
    if (task.status === 'completed') throw new Error('TASK_ALREADY_COMPLETED');

    const updated = { ...task, status: 'completed' };
    const result = await this.repository.save('task', task.id, updated);
    await this.publish({
      type: 'task.completed',
      taskId: result.id,
      processId: result.processId,
      status: result.status
    });
    return result;
  }

  async getTask(taskId) {
    const task = await this.repository.find('task', taskId);
    if (!task) throw new Error('TASK_NOT_FOUND');
    if (!VALID_STATUSES.has(task.status)) throw new Error('INVALID_TASK_STATE');
    return task;
  }
}

module.exports = { WorkflowEngine };

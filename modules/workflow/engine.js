const VALID_STATUSES = new Set(['pending', 'in_progress', 'completed']);

class WorkflowEngine {
  constructor({ repository }) {
    if (!repository) throw new TypeError('WorkflowEngine requires a repository');
    this.repository = repository;
  }

  async startTask({ taskId, processId }) {
    const task = await this.repository.find('task', taskId);
    if (!task) throw new Error('TASK_NOT_FOUND');
    if (task.processId !== processId) throw new Error('PROCESS_BOUNDARY_VIOLATION');
    if (task.status === 'completed') throw new Error('TASK_ALREADY_COMPLETED');

    const updated = { ...task, status: 'in_progress' };
    return this.repository.save('task', task.id, updated);
  }

  async completeTask({ taskId, processId }) {
    const task = await this.repository.find('task', taskId);
    if (!task) throw new Error('TASK_NOT_FOUND');
    if (task.processId !== processId) throw new Error('PROCESS_BOUNDARY_VIOLATION');
    if (task.status === 'completed') throw new Error('TASK_ALREADY_COMPLETED');

    const updated = { ...task, status: 'completed' };
    return this.repository.save('task', task.id, updated);
  }

  async getTask(taskId) {
    const task = await this.repository.find('task', taskId);
    if (!task) throw new Error('TASK_NOT_FOUND');
    if (!VALID_STATUSES.has(task.status)) throw new Error('INVALID_TASK_STATE');
    return task;
  }
}

module.exports = { WorkflowEngine };

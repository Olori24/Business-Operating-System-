class SchedulerEngine {
  constructor({ repository, queueEngine }) {
    if (!repository || !queueEngine) throw new TypeError('SchedulerEngine requires repository and queueEngine');
    this.repository = repository;
    this.queueEngine = queueEngine;
  }

  async schedule({ id, taskId, processId, runAt }) {
    if (!id || !taskId || !processId || !runAt) throw new TypeError('Scheduler requires id, taskId, processId and runAt');
    const task = await this.repository.find('task', taskId);
    if (!task || task.processId !== processId) throw new Error('TASK_NOT_FOUND');
    const timestamp = new Date(runAt).getTime();
    if (!Number.isFinite(timestamp)) throw new Error('INVALID_RUN_AT');
    const existing = await this.repository.find('schedule', id);
    if (existing) throw new Error('SCHEDULE_EXISTS');
    return this.repository.save('schedule', id, { id, taskId, processId, runAt: new Date(timestamp).toISOString(), status: 'scheduled' });
  }

  async dispatchDue({ now = new Date() } = {}) {
    const current = new Date(now).getTime();
    if (!Number.isFinite(current)) throw new Error('INVALID_NOW');
    const schedules = await this.repository.all('schedule');
    const dispatched = [];
    for (const item of schedules) {
      if (item.status !== 'scheduled' || new Date(item.runAt).getTime() > current) continue;
      await this.queueEngine.enqueue(item.taskId, item.processId);
      item.status = 'dispatched';
      await this.repository.save('schedule', item.id, item);
      dispatched.push(item);
    }
    return dispatched;
  }
}

module.exports = { SchedulerEngine };

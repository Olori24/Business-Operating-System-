class SchedulerEngine {
  constructor({ repository, queueEngine, eventBus = null }) {
    if (!repository || !queueEngine) throw new TypeError('SchedulerEngine requires repository and queueEngine');
    this.repository = repository;
    this.queueEngine = queueEngine;
    this.eventBus = eventBus;
    this.unsubscribe = null;
    if (eventBus) this.unsubscribe = eventBus.subscribe('task.schedule_requested', (event) => this.handleScheduleRequested(event));
  }

  async publish(event) { if (this.eventBus) await this.eventBus.publish(event); }

  async schedule({ id, taskId, processId, runAt }) {
    if (!id || !taskId || !processId || !runAt) throw new TypeError('Scheduler requires id, taskId, processId and runAt');
    const task = await this.repository.find('task', taskId);
    if (!task || task.processId !== processId) throw new Error('TASK_NOT_FOUND');
    const timestamp = new Date(runAt).getTime();
    if (!Number.isFinite(timestamp)) throw new Error('INVALID_RUN_AT');
    if (await this.repository.find('schedule', id)) throw new Error('SCHEDULE_EXISTS');
    const result = await this.repository.save('schedule', id, { id, taskId, processId, runAt: new Date(timestamp).toISOString(), status: 'scheduled' });
    await this.publish({ type: 'schedule.created', scheduleId: result.id, taskId: result.taskId, processId: result.processId, runAt: result.runAt });
    return result;
  }

  async cancel(id) {
    const schedule = await this.repository.find('schedule', id);
    if (!schedule) throw new Error('SCHEDULE_NOT_FOUND');
    if (schedule.status === 'dispatched') throw new Error('SCHEDULE_ALREADY_DISPATCHED');
    const result = await this.repository.save('schedule', id, { ...schedule, status: 'cancelled' });
    await this.publish({ type: 'schedule.cancelled', scheduleId: id });
    return result;
  }

  async handleScheduleRequested(event) {
    if (!event || !event.scheduleId || !event.taskId || !event.processId || !event.runAt) return null;
    return this.schedule({ id: event.scheduleId, taskId: event.taskId, processId: event.processId, runAt: event.runAt });
  }

  async dispatchDue({ now = new Date() } = {}) {
    const current = new Date(now).getTime();
    if (!Number.isFinite(current)) throw new Error('INVALID_NOW');
    const schedules = await this.repository.all('schedule');
    const dispatched = [];
    for (const item of schedules) {
      if (item.status !== 'scheduled' || new Date(item.runAt).getTime() > current) continue;
      const claimed = { ...item, status: 'dispatching' };
      await this.repository.save('schedule', item.id, claimed);
      try {
        await this.queueEngine.enqueue(item.taskId, item.processId);
        const completed = { ...claimed, status: 'dispatched' };
        await this.repository.save('schedule', item.id, completed);
        await this.publish({ type: 'schedule.dispatched', scheduleId: item.id, taskId: item.taskId, processId: item.processId });
        dispatched.push(completed);
      } catch (error) {
        await this.repository.save('schedule', item.id, { ...claimed, status: 'scheduled', lastError: error.message });
        throw error;
      }
    }
    return dispatched;
  }
}

module.exports = { SchedulerEngine };

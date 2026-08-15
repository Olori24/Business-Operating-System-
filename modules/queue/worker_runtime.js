class DistributedWorkerRuntime {
  constructor({ queue, handler, workerId, pollIntervalMs = 1000, concurrency = 1, leaseMs = 30000, heartbeatIntervalMs = 10000 }) {
    if (!queue || typeof queue.claim !== 'function') throw new TypeError('DistributedWorkerRuntime requires queue');
    if (typeof handler !== 'function') throw new TypeError('DistributedWorkerRuntime requires handler');
    if (!workerId) throw new TypeError('DistributedWorkerRuntime requires workerId');
    if (!Number.isInteger(concurrency) || concurrency < 1) throw new TypeError('concurrency must be a positive integer');
    this.queue = queue;
    this.handler = handler;
    this.workerId = workerId;
    this.pollIntervalMs = pollIntervalMs;
    this.concurrency = concurrency;
    this.leaseMs = leaseMs;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.running = false;
    this.active = 0;
    this.timer = null;
    this.heartbeats = new Map();
  }

  async process(taskId) {
    if (this.active >= this.concurrency) return false;
    this.active += 1;
    try {
      const item = await this.queue.claim(taskId, this.workerId, this.leaseMs);
      this.startHeartbeat(taskId);
      await this.handler(item, this.workerId);
      await this.queue.complete(taskId, this.workerId);
      return true;
    } catch (error) {
      if (typeof this.queue.retry === 'function') await this.queue.retry(taskId, this.workerId).catch(() => {});
      throw error;
    } finally {
      this.stopHeartbeat(taskId);
      this.active -= 1;
    }
  }

  startHeartbeat(taskId) {
    if (typeof this.queue.heartbeat !== 'function') return;
    const timer = setInterval(() => {
      this.queue.heartbeat(taskId, this.workerId, this.leaseMs).catch(() => {});
    }, this.heartbeatIntervalMs);
    this.heartbeats.set(taskId, timer);
  }

  stopHeartbeat(taskId) {
    const timer = this.heartbeats.get(taskId);
    if (timer) clearInterval(timer);
    this.heartbeats.delete(taskId);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const tick = async () => {
      if (!this.running) return;
      if (typeof this.queue.next !== 'function') return;
      while (this.running && this.active < this.concurrency) {
        const taskId = await this.queue.next(this.workerId);
        if (!taskId) break;
        this.process(taskId).catch(() => {});
      }
      this.timer = setTimeout(tick, this.pollIntervalMs);
    };
    this.timer = setTimeout(tick, 0);
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    for (const taskId of this.heartbeats.keys()) this.stopHeartbeat(taskId);
  }
}

module.exports = { DistributedWorkerRuntime };

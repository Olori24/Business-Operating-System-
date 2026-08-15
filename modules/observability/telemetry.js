class Telemetry {
  constructor({ clock = () => new Date().toISOString() } = {}) {
    this.clock = clock;
    this.events = [];
  }

  record(event, fields = {}) {
    const entry = { timestamp: this.clock(), event, ...fields };
    this.events.push(entry);
    return entry;
  }

  snapshot() { return this.events.slice(); }
}

module.exports = { Telemetry };

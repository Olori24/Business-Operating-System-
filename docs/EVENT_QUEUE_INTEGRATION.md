# Event-Driven Queue Integration

Mission 016 connects workflow completion events to downstream queue work.

When a `task.completed` event contains `nextTaskId`, the queue worker engine enqueues that task in the same process boundary. Completion events without downstream work are ignored.

The integration is optional: `QueueWorkerEngine` continues to operate normally without an event bus.

This mission does not introduce durable messaging, external brokers, fan-out policies, or automatic task graph discovery.

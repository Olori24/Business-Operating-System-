# Scheduler Event Integration

Mission 017 connects the Scheduler Engine to the in-process Event Bus.

## Events

- `task.schedule_requested` creates a validated schedule.
- `schedule.created` is emitted after schedule persistence.
- `schedule.dispatched` is emitted after due work has been enqueued and the schedule is marked dispatched.

The Event Bus remains optional, preserving compatibility for existing Scheduler Engine callers.

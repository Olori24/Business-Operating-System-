# Event Integration

Mission 015 connects workflow task transitions to the in-process domain event bus.

## Events

- `task.started` is published after a task is persisted as `in_progress`.
- `task.completed` is published after a task is persisted as `completed`.

Events include `taskId`, `processId`, and the resulting `status`.

The event bus is optional in `WorkflowEngine`, preserving compatibility for existing callers. Event publication is performed only after successful persistence, so subscribers observe committed workflow state.

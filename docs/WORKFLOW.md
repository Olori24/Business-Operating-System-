# Workflow Engine

Mission 011 introduces the first execution layer for the Business → Process → Task model.

## Task lifecycle

Tasks move through the existing states:

`pending → in_progress → completed`

The engine persists transitions through the repository abstraction rather than accessing storage internals.

## Boundary rules

Every transition requires the caller to identify the owning process. A task cannot be transitioned through a different process, and completed tasks cannot be completed again.

## Scope

This mission deliberately does not introduce queues, retries, scheduling, AI agents, or external workers. Those concerns can be layered on top of the deterministic workflow state machine after its contract is stable.

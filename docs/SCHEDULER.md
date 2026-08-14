# Scheduler Engine

Mission 013 adds a repository-backed scheduler between time-based triggers and the queue worker engine.

## Lifecycle

`scheduled → dispatched → queue`

A schedule records the task, process boundary, execution time, and lifecycle status. `dispatchDue()` finds scheduled items whose `runAt` is at or before the supplied clock and enqueues them through the existing queue engine.

The scheduler does not execute tasks itself. It is responsible only for time-based dispatch. Queue workers remain responsible for claiming, retrying, and completing work.

## Safety

Scheduling validates that the task belongs to the supplied process. Invalid timestamps and duplicate schedule IDs are rejected.

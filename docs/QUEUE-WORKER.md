# Queue & Worker Engine

Mission 012 introduces a repository-backed queue boundary on top of the workflow engine.

## Lifecycle

`queued → processing → completed`

A processing item may return to `queued` for retry.

## Guarantees

- Tasks are queued only within their declared process boundary.
- A queued item can be claimed exactly through the `queued` state.
- Claims increment an attempt counter.
- Completion delegates the task transition to the workflow engine before marking the queue item completed.
- Retry is allowed only for processing items.
- No external queue provider or background worker process is selected yet.

The implementation is intentionally provider-neutral so a durable queue adapter can be introduced later without changing the business workflow contract.

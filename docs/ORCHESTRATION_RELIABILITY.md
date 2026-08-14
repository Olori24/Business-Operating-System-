# Orchestration Reliability

Mission 019 provides a small reliability boundary for orchestration operations.

## Guarantees

- Operations can be retried up to a configured maximum attempt count.
- Successful operations return immediately and are not retried.
- Terminal failures preserve and rethrow the original error.
- A terminal failure callback receives the execution context, attempt count, and error.

The reliability layer is intentionally provider-neutral. Durable queues, persistent retry state, exponential backoff, and distributed locking remain separate concerns.

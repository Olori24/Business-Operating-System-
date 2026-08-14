# Exactly-Once Idempotency

Mission 024 adds an explicit idempotency key to recovery-aware orchestration.

## Contract

- A missing key defaults to the execution id.
- The first execution persists the key.
- Repeated execution of a completed record returns the persisted result without invoking the operation again.
- A different key for the same execution is rejected with `IDEMPOTENCY_KEY_MISMATCH`.

This provides an application-level exactly-once execution guard for completed executions. It does not claim distributed transactional exactly-once delivery across external systems.

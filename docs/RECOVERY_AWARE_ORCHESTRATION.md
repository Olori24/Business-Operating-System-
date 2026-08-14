# Recovery-Aware Orchestration

Mission 022 connects durable recovery to the orchestration execution path.

## Contract

`RecoveryAwareOrchestrator` loads persisted execution state before running work. Recoverable states are resumed through `DurableOrchestrationRecovery`, then marked `running` and executed.

Successful work is persisted as `completed` with its result. Failed work is persisted as `failed` with the error message before the error is rethrown.

Completed executions are never re-executed through the recovery path.

This layer coordinates existing durable state and recovery primitives; it does not claim distributed persistence or cross-process locking beyond the repository implementation supplied to the state layer.

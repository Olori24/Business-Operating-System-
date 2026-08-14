# Durable Recovery and Crash Resume

Mission 021 adds a recovery boundary on top of durable orchestration state.

Recoverable executions can be discovered and moved into `resuming` state after an interruption. Each recovery increments `recoveryCount` and records `lastRecoveredAt`.

Terminal executions such as `completed` are not resumed. The recovery component does not claim process-restart durability beyond the configured repository; the current repository implementation remains in-memory.

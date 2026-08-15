# Durable Worker Leases

Mission 028 adds lease-based ownership to queue processing.

## Contract

A worker claim records `workerId` and `leaseExpiresAt`. Only the lease owner may heartbeat, complete, or retry the task. A worker may reclaim a processing task after its lease expires.

## Runtime

`DistributedWorkerRuntime` renews active leases with periodic heartbeats and clears heartbeat timers when work finishes or the worker stops.

## Failure model

A worker crash stops heartbeats. Once the lease expires, another worker can reclaim the task. Idempotency remains responsible for protecting external side effects from duplicate execution.

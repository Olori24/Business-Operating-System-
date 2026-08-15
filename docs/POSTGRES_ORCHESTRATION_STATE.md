# PostgreSQL Orchestration State

Mission 026 connects the orchestration state contract to the production PostgreSQL repository through a tenant-scoped adapter.

## Runtime boundary

```text
PostgresRepository
       |
TenantScopedRepository(tenantId)
       |
PostgresOrchestrationState
       |
DurableOrchestrationState
       |
Recovery / idempotency consumers
```

`PostgresOrchestrationState` preserves the existing durable-state API while routing every persistence operation through the tenant-aware PostgreSQL repository. This keeps orchestration code independent from SQL details while making the persistence boundary explicit.

## Safety boundary

Every state lookup, write, enumeration, and deletion is scoped by `tenantId`. The adapter fails closed when a tenant ID is missing.

The existing `InMemoryRepository` remains useful for isolated unit tests. Production orchestration should construct `PostgresOrchestrationState` with `PostgresRepository` and a verified tenant identity.

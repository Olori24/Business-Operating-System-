# Durable Orchestration State

Mission 020 introduces a persistence-backed execution-state abstraction for orchestration.

Each execution has a stable `id`, workflow metadata, lifecycle `status`, attempt count, and update timestamp. State is stored through the repository interface, keeping orchestration independent of a specific database.

The abstraction supports create, read, update, and controlled resume operations. Resume is limited to `pending`, `retrying`, and `failed` executions.

The current repository implementation is in-memory, so this mission establishes the durable-state contract and persistence boundary; true process-restart durability requires a persistent repository implementation in a later mission.

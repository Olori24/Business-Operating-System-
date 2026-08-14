# Persistence Architecture

Mission 007 establishes a storage boundary without selecting a database vendor.

## Repository contract

Application and domain code should depend on a repository interface rather than a concrete database implementation.

The initial `InMemoryRepository` provides a deterministic implementation for local development and tests. It supports `save`, `find`, `delete`, and `clear` operations and clones stored values to prevent accidental shared mutable state.

## Why no database yet?

BOS should first stabilize domain behavior and persistence boundaries. Selecting PostgreSQL, Supabase, MongoDB, or another provider is a separate architectural decision that should follow concrete requirements for transactions, authorization, indexing, tenancy isolation, backups, and deployment.

## Tenancy rule

Persistence implementations must preserve the organization boundary established by the identity domain. A future persistent adapter must make tenant scoping explicit rather than relying on callers to remember it implicitly.

## Future adapter

A production adapter should implement the same repository contract while adding durable storage, transactions, indexes, tenant-aware queries, and operational controls.

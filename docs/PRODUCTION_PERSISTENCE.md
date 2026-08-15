# Production Persistence Foundation

Mission 025 establishes the first production persistence boundary for BOS.

## Architecture

The production adapter is `PostgresRepository` and uses a PostgreSQL connection pool. Records are scoped by `tenant_id`, `record_type`, and `record_id` so application persistence cannot accidentally address another tenant's record through the repository API.

The SQL schema stores domain payloads as JSONB while keeping tenant/type/id as indexed relational identity fields. Upserts are atomic at the record level and transactions use explicit `BEGIN`, `COMMIT`, and `ROLLBACK` boundaries.

## Runtime configuration

`PostgresRepository.fromConnectionString(process.env.DATABASE_URL)` creates a repository from a PostgreSQL connection string. The `pg` package is a production dependency.

## Important boundary

This mission adds the production persistence adapter and schema, but does not silently replace every existing in-memory repository consumer. Existing tests and components remain compatible while the tenant-aware adapter becomes the production persistence target for subsequent migration work.

The next persistence mission should migrate orchestration state to this adapter and add real PostgreSQL integration tests against a provisioned database.

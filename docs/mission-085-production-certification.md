# Mission 085 — Production Certification

BOS is customer-ready only when a new early-access customer can create a persistent workspace and run a persisted automation against the production PostgreSQL backend.

## Current certification path

1. Customer submits business name and email to `/api/v1/onboarding`.
2. BOS derives a stable tenant ID and persists the workspace.
3. Customer runs a workflow using `x-tenant-id`.
4. Automation actions persist business records instead of returning simulated acceptance payloads.
5. Execution records remain tenant-scoped and recoverable from PostgreSQL.

## Remaining certification

Real external provider credentials and verified external effects must be enabled before commercial certification. The production test must exercise at least one real external integration and duplicate/failure/retry behavior.

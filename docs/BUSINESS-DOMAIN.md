# Business Domain Core

Mission 010 introduces the first business-facing domain primitives for BOS.

## Model

`Organization -> Business -> Process -> Task`

- **Organization** remains the tenant boundary.
- **Business** represents an operational business owned by an organization.
- **Process** represents a repeatable business workflow belonging to a business.
- **Task** represents an actionable unit within a process.

## Invariants

Every business must reference an organization. Every process must reference a business. Every task must reference a process.

Task lifecycle states are deliberately limited to `pending`, `in_progress`, and `completed` for this mission.

AI agents are intentionally not introduced here. Agent orchestration should consume these stable business primitives rather than define them.

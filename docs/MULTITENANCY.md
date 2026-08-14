# Multi-tenant domain foundation

Mission 006 establishes the initial tenant model without selecting a persistence provider.

## Core entities

- **Organization** — the tenant boundary for a business.
- **User** — an identity that may belong to one or more organizations.
- **Role assignment** — the user's authorization role within an organization.
- **Workspace** — an operational scope owned by an organization.

## Invariants

1. Organization, user, and workspace records require stable identifiers.
2. A workspace is explicitly scoped to an organization.
3. A role assignment is explicitly scoped to an organization and user.
4. Roles are initially limited to `owner`, `admin`, and `member`.
5. This layer contains domain contracts only; persistence and authentication remain separate concerns.

## Future evolution

Persistence, authentication, invitations, organization membership, and authorization policies can be added without changing the basic tenant boundary.

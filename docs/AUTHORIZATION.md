# Authorization Enforcement

Mission 009 establishes the first executable authorization boundary for BOS.

## Rules

Authorization is evaluated using four facts:

1. authenticated role
2. requested permission
3. caller organization
4. resource organization

A request is permitted only when the role owns the requested permission **and** the caller and resource belong to the same organization.

## Initial permissions

- `owner`: organization read/write, workspace read/write, member read/write
- `admin`: organization read/write, workspace read/write, member read/write
- `member`: organization read, workspace read/write

These permissions are intentionally small. They are a foundation, not the final BOS permission catalog.

## Security invariant

Cross-organization access is denied regardless of role. Authorization must not rely on callers remembering to perform tenant checks themselves.

`assertAuthorized()` provides a stable `FORBIDDEN` error for application boundaries.

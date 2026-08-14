# Runtime Foundation

Mission 004 establishes the first executable BOS runtime without coupling the product to a web framework prematurely.

## API runtime

`apps/api/server.js` provides a minimal Node.js HTTP service with:

- `GET /` — runtime identity
- `GET /health` — machine-readable health status
- JSON 404 responses for unknown routes

The runtime uses Node.js built-in modules only. This keeps the foundation small, portable, and dependency-light while the product architecture is validated.

## Boundary

This runtime is BOS application infrastructure. OAE remains the separate engineering system responsible for governed planning, implementation, verification, and repository operations.

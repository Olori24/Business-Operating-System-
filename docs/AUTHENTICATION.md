# Authentication and Authorization Boundary

Mission 008 establishes a provider-neutral authentication boundary.

## Authentication

Authentication establishes that a user has an active identity and creates an organization-scoped session.

The `AuthService` depends on repository and token-generation interfaces. It does not select a hosted identity provider or database.

## Authorization

Authentication and authorization are separate concerns. A valid session identifies the user and organization; role assignment determines what that user may do within the organization.

## Security boundary

Production implementations must add token expiry, revocation, secure token storage, transport security, rate limiting, audit events, and provider-specific credential handling before exposing authentication publicly.

This mission deliberately establishes the application boundary rather than pretending the in-memory implementation is production authentication.

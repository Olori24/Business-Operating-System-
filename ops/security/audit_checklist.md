# Production security audit checklist

- Tenant context required on protected resources
- Cross-tenant access rejected
- Authentication and authorization enforced before business operations
- Secrets excluded from source and logs
- Idempotency keys not logged as secrets or credentials
- Dependency installation and test suite run in CI
- Production readiness requires healthy dependencies
- Recovery promotion requires operator approval
- Audit events include tenant and execution identifiers
- Security-sensitive failures are classified as non-retryable

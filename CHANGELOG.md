# Changelog

All notable changes to the Business Operating System are documented here.

## [Unreleased]

### Added
- Reusable HTTP request schemas for authentication, onboarding, workflows, automation, and WhatsApp integration.
- Deterministic in-memory persistence test store for unit tests.
- `/api/metrics` service metrics endpoint with request/error counters and process uptime.
- Optional SENTRY_DSN error reporting through the observability layer.
- PostgreSQL integration test target using Docker Compose.
- Weekly Dependabot updates for npm dependencies.
- JavaScript project configuration with `checkJs` enabled.

### Changed
- CI now has explicit lint, test, static-check, dependency-audit, and integration-test entry points.
- HTTP validation failures use the stable `VALIDATION_FAILED` error code.

## [1.1.0]

- Current stable BOS release before the score-hardening mission.

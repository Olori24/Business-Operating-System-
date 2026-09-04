# Business Operating System (BOS)

> **The programmable operating layer for modern businesses.**

![Version](https://img.shields.io/badge/version-v1.0.0-blue)
![Status](https://img.shields.io/badge/status-production%20SaaS%20foundation-success)
![Architecture](https://img.shields.io/badge/architecture-modular-success)
![Multi--Tenant](https://img.shields.io/badge/multi--tenant-ready-success)
![Node](https://img.shields.io/badge/node-%3E%3D22-green)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-success)

---

## Overview

**Business Operating System (BOS)** is a modular, multi-tenant SaaS platform for running business operations through configurable workflows, integrations, events, notifications, and durable automation.

The core idea is simple:

> **Configure how work should happen once, then let BOS execute it, recover from failures, record what happened, and keep the business in control.**

BOS is being built as a platform rather than a single industry-specific application. A business can create a workspace, invite its team, connect integrations, define workflows, publish automations, and monitor execution from one operational layer.

---

## What BOS Provides

### Identity & Account Lifecycle

- Email registration and login
- Session-based authentication
- Logout and session revocation
- Email verification lifecycle
- Password reset lifecycle
- Google authentication support when configured
- Protected API boundaries

### Multi-Tenant Workspaces

- Workspace creation and ownership
- Workspace membership
- Role-aware access boundaries
- Workspace listing and switching
- Invitation acceptance
- Tenant-scoped persistence
- Server-side authorization boundaries

BOS treats tenant isolation as a platform requirement. Workspace identifiers supplied by clients must never be treated as sufficient authorization by themselves.

### Workflow Automation

- Workflow definitions
- Draft/published lifecycle
- Workflow version persistence
- Enable/disable controls
- Trigger definitions
- Conditions and branching
- Action execution
- Execution history
- Step-level execution records
- Retry handling
- Idempotency keys
- Scheduled workflow execution

### Durable Execution

BOS persists execution state in PostgreSQL rather than relying on an in-memory queue alone.

The execution path is designed around:

```text
Trigger
   ↓
Workflow version
   ↓
Execution record
   ↓
Durable job
   ↓
Worker
   ↓
Step execution
   ↓
Success / retry / failure
   ↓
Audit + observability
```

The system is designed for retries and recovery. It does **not** claim distributed exactly-once delivery for arbitrary external systems; integrations must provide or participate in appropriate idempotency mechanisms where supported.

### Integrations & Webhooks

The platform includes an extensible integration foundation for business systems and external services.

Current production foundations include:

- Integration records and connection state
- Encrypted credential storage architecture
- Outbound webhook actions
- WhatsApp action integration hooks
- Signed inbound webhook boundaries
- Event persistence
- Duplicate/idempotency protection
- Connection status and lifecycle handling

External provider credentials are designed to remain server-side and must not be exposed to the browser.

### Notifications & Audit

BOS records operational events that matter to businesses and administrators:

- Workflow failures
- Important workflow events
- Integration failures
- Account events
- Workspace events
- Notifications
- Audit records

Audit records are designed to capture the actor, workspace, action, resource, timestamp, and relevant metadata without storing passwords or raw credentials.

### Operational Dashboard

The `/dashboard` experience is backed by live API/database data rather than hard-coded production metrics.

The operational view can surface:

- Active workflows
- Successful executions
- Failed executions
- Queued work
- Connected integrations
- Recent activity
- Notifications
- Operational attention areas

---

## Architecture

```text
                         BUSINESS OPERATING SYSTEM

                              Web / API Layer
                                     │
                           Identity & Authorization
                                     │
                          Workspace / Tenant Context
                                     │
             ┌───────────────────────┼───────────────────────┐
             │                       │                       │
         Workflows              Integrations              Events
             │                       │                       │
             └───────────────────────┼───────────────────────┘
                                     │
                            Durable Execution Layer
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                  Jobs           Scheduler         Worker
                    │                │                │
                    └────────────────┼────────────────┘
                                     │
                             PostgreSQL State
                                     │
            ┌────────────────────────┼────────────────────────┐
            │                        │                        │
        Executions              Notifications              Audit
            │                        │                        │
            └────────────────────────┼────────────────────────┘
                                     │
                            External Integrations
```

The repository intentionally keeps the business execution layer modular so additional integrations, triggers, actions, and product surfaces can be added without replacing the core platform.

---

## Production SaaS Data Model

The production schema foundation is maintained in:

```text
packages/persistence/saas_schema.sql
```

It provides durable structures for:

- Workspace memberships
- Workspace invitations
- Integrations
- Workflows
- Workflow versions
- Workflow executions
- Execution steps
- Events
- Durable jobs
- Notifications
- Audit logs
- Billing accounts

The schema includes foreign keys, uniqueness constraints, indexes, timestamps, and workspace-scoped relationships intended to keep tenant data separated at the persistence layer.

The production store applies the SaaS schema during initialization.

---

## Authentication & Security

Security-sensitive operations are handled server-side.

The platform includes foundations for:

- Signed session cookies
- Session revocation
- Password hashing
- Verification/reset tokens stored as hashes
- Token expiry and invalidation
- Google credential verification
- Workspace membership checks
- Tenant-scoped queries
- Signed webhook verification
- Encrypted integration credentials
- Audit logging

### Required production secrets

Never commit real credentials. Configure environment variables through the deployment platform or secret manager.

The committed `.env.example` documents the required configuration, including:

```text
DATABASE_URL
GOOGLE_CLIENT_ID
BOS_SESSION_SECRET
BOS_ENCRYPTION_KEY
BOS_WEBHOOK_SECRET
CRON_SECRET
BOS_APP_URL
RESEND_API_KEY
BOS_EMAIL_FROM
PORT
LOG_LEVEL
WHATSAPP_GRAPH_VERSION
SENTRY_DSN
```

`BOS_ENCRYPTION_KEY` must be generated as 32 random bytes represented by 64 hexadecimal characters.

---

## Scheduling on Vercel Hobby

BOS supports scheduled workflow execution through the durable job system.

For the current Vercel Hobby-compatible deployment model, recurring execution is exposed through:

```text
GET /api/v1/cron
```

The endpoint requires the `CRON_SECRET` bearer credential and processes queued jobs plus due scheduled workflows.

Because the Vercel Hobby plan does not support the sub-daily Cron schedule required for frequent business automation, the repository includes an external scheduler workflow:

```text
.github/workflows/bos-cron.yml
```

The workflow can invoke the BOS cron endpoint on a recurring interval and can also be triggered manually.

Required GitHub Actions secrets/variables for that scheduler include:

```text
BOS_CRON_URL
CRON_SECRET
```

For higher-scale production workloads, the scheduler should be moved to infrastructure designed for the required execution frequency and reliability characteristics.

---

## API Health

The catch-all API exposes a lightweight health contract:

```text
GET /api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "bos-api"
}
```

Health availability does not by itself prove that every external integration, database dependency, or background worker is healthy. Production monitoring should use dependency-aware readiness and operational checks as appropriate.

---

## Repository Structure

```text
.
├── api/                         # Deployment-facing serverless API entrypoint
├── apps/
│   ├── api/                     # Core HTTP application
│   └── dashboard/               # Browser-facing dashboard surfaces
├── modules/
│   ├── automation/              # Workflow execution and automation
│   ├── billing/                 # Billing domain foundations
│   ├── integrations/            # Integration capabilities
│   ├── queue/                   # Queue primitives
│   ├── scheduler/               # Scheduling primitives
│   └── ...                      # Other domain modules
├── packages/
│   ├── auth/                    # Authentication and account lifecycle
│   ├── authz/                   # Authorization primitives
│   ├── persistence/             # PostgreSQL production store/schema
│   ├── observability/           # Logging/observability
│   └── ...                      # Shared platform packages
├── ops/                         # Production, security and recovery controls
├── scripts/                     # Development and operational scripts
├── tests/                       # Additional focused tests
├── .github/workflows/           # CI and external scheduler automation
├── docker-compose*.yml          # Local/integration environments
├── vercel.json                  # Vercel routing/deployment configuration
└── package.json                 # Runtime and test commands
```

---

## Development

### Requirements

- Node.js **22 or newer**
- PostgreSQL for persistence/integration testing
- Docker is recommended for local integration testing

### Install

```bash
git clone https://github.com/Olori24/Business-Operating-System-.git
cd Business-Operating-System-
npm ci
```

### Run locally

```bash
npm run dev
```

or:

```bash
npm start
```

### Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm audit --audit-level=high
```

### Integration testing

With a local PostgreSQL environment:

```bash
npm run test:integration
```

Or use the repository's test Docker environment:

```bash
npm run test:integration:local
```

The test suite uses c8 coverage enforcement with the repository's configured minimums of **60% line coverage** and **50% branch coverage**.

---

## Deployment

BOS is configured for Vercel-compatible deployment through the repository's deployment configuration.

The deployment model currently uses a consolidated API catch-all to stay within serverless-function limits on the Vercel Hobby plan.

Before a real production launch, configure and verify at minimum:

1. PostgreSQL database and connectivity
2. Session and encryption secrets
3. Webhook secret
4. Cron authentication secret
5. Application URL
6. Email provider/domain if account emails are enabled
7. Google OAuth configuration if Google sign-in is enabled
8. External integration credentials
9. Monitoring/error reporting
10. GitHub scheduler secrets if using the included external scheduler
11. DNS/TLS and production domain
12. Backup and restore procedures
13. Load/performance testing
14. Security testing and incident-response procedures

A successful deployment build is necessary but is **not sufficient evidence of production readiness**.

---

## Workflow Execution Model

A published workflow follows the durable execution path:

```text
                  Workflow definition
                          │
                          ▼
                    Published version
                          │
             ┌────────────┼────────────┐
             │            │            │
          webhook       manual      schedule
             │            │            │
             └────────────┼────────────┘
                          ▼
                    Execution record
                          │
                          ▼
                     Durable job
                          │
                          ▼
                        Worker
                          │
                ┌─────────┴─────────┐
                │                   │
             execute             failure
                │                   │
                ▼                   ▼
             complete          retry/backoff
                                    │
                                    ▼
                                terminal
```

Execution and step records provide a durable history that can be used by the dashboard and operational tooling.

---

## Reliability Boundaries

BOS is designed with failure as a normal operating condition.

The system protects against common failure modes through:

- Durable job records
- Transactional job claiming
- `FOR UPDATE SKIP LOCKED` queue selection
- Retry state
- Execution status persistence
- Idempotency keys for scheduled execution
- Durable workflow versions
- Event persistence
- Audit records

However, no application-level architecture can guarantee that an arbitrary third-party API behaves exactly once. External side effects require provider-aware idempotency, reconciliation, and retry policies.

---

## Product Boundaries

BOS currently represents a **production SaaS foundation**, not a claim that every possible commercial feature is fully implemented.

In particular:

- The billing data model/foundation exists, but a complete payment-provider checkout and subscription-billing implementation must be verified before claiming end-to-end payment processing.
- External integrations must be individually configured and tested; a registered integration is not automatically a live connection.
- The external GitHub scheduler requires its repository secrets to be configured before scheduled jobs will run.
- Production readiness requires environment-specific validation beyond repository tests.

These boundaries are documented deliberately so project status remains aligned with demonstrated capability.

---

## Roadmap

The next stages of BOS focus on moving from production foundation to a mature commercial service:

- Complete end-to-end visual workflow builder integration
- Expand trigger/action catalog
- Production-grade integration connection flows
- Full billing provider integration and entitlement enforcement
- Account/profile/settings surfaces
- Advanced rate limiting and abuse controls
- Operational alerting and incident workflows
- Queue scaling and worker concurrency controls
- Usage analytics and customer reporting
- Comprehensive end-to-end browser testing
- Load testing and performance budgets
- Backup/restore automation
- Security assessment and penetration testing
- Enterprise controls and compliance automation
- Multi-region execution where scale requires it

---

## Engineering Principles

1. **Do not rebuild working systems without evidence.**
2. **Tenant isolation is mandatory.**
3. **Persist important operational state.**
4. **Treat failures and retries as normal.**
5. **Never expose secrets to clients.**
6. **Verify before claiming completion.**
7. **Keep integrations explicit about their real connection state.**
8. **Use audit trails for important business actions.**
9. **Prefer small, testable architectural changes.**
10. **Production claims must match demonstrated capability.**

The operating loop is:

```text
Inspect
  ↓
Design
  ↓
Implement
  ↓
Test
  ↓
Verify
  ↓
Deploy
  ↓
Observe
  ↓
Improve
```

---

## OAE Relationship

**OAE (Open Autonomous Engineer)** is a separate engineering system focused on autonomous software engineering.

The intended boundary is:

```text
OAE
Engineering Control Plane
        │
        │ build / inspect / verify / govern
        ▼
BOS
Business Execution Plane
        │
        ├── Workflows
        ├── Integrations
        ├── Events
        └── Business operations
```

Keeping the systems separate preserves a clean distinction between engineering automation and business execution.

---

## Project Status

**BOS v1.0.0 — production SaaS foundation in active hardening and deployment.**

The current repository includes the production SaaS foundation for:

- Authentication and account lifecycle
- Multi-tenant workspaces
- Membership and invitations
- Durable workflow versions
- Workflow executions
- Durable jobs
- Scheduled execution
- Webhook/event ingestion foundations
- Integrations and credential protection
- Notifications
- Audit logging
- Operational dashboard
- PostgreSQL persistence
- CI and automated verification
- Vercel-compatible deployment
- External scheduling for Vercel Hobby deployments

The project is moving from **platform construction into live production validation, commercial completion, and scale engineering**.

---

## Author

**Bolaji Akande**  
Founder / Builder

Building business infrastructure and autonomous systems for the future of work.

GitHub: https://github.com/Olori24

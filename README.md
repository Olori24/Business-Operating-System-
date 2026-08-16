# Business Operating System (BOS)

> **The programmable operating layer for modern businesses.**

![Version](https://img.shields.io/badge/version-v1.0.0-blue)
![Status](https://img.shields.io/badge/status-production--hardening-orange)
![Architecture](https://img.shields.io/badge/architecture-modular-success)
![Multi--Tenant](https://img.shields.io/badge/multi--tenant-ready-success)

---

## Production target

BOS is being hardened into a complete business-automation SaaS. The production bar is an end-to-end customer workflow: persistent tenant workspace, persistent workflow, real event trigger, automation execution, verified external action, execution history, retries, security controls, and customer-visible observability.

The public web application is live, but BOS is **not declared production-ready until that complete customer workflow passes in production**.

## Current production foundation

- Vercel production deployment
- PostgreSQL persistence
- Tenant-scoped records
- Persistent execution history
- Idempotent automation execution
- Persistent workflow lifecycle API
- Webhook trigger ingress
- Workflow-versioned execution records
- Customer-facing Workflow Builder

## Production certification gate

A release is certified only when a real customer can:

1. Create or access an isolated workspace.
2. Persist and activate a workflow.
3. Receive an external event.
4. Trigger the workflow automatically.
5. Execute the configured business actions.
6. Verify the resulting external state.
7. Inspect execution history and failures.
8. Recover safely from duplicate events and transient failures.

Until that gate passes, BOS remains in **production hardening**.

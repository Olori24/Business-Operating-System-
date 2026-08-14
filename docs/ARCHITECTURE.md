# Architecture

## Purpose

The Business Operating System is the product layer for business workflows, automation, AI employees, and industry-specific capabilities.

## Repository boundaries

### OAE

OAE (Open Autonomous Engineer) remains a separate engineering operating system. It provides governed engineering capabilities such as planning, execution, verification, repository intelligence, memory, security, and agent coordination.

### BOS

BOS contains the business product and its domain capabilities. It should not duplicate OAE's engineering kernel.

## Initial repository layers

- `apps/` — deployable applications and services
- `packages/` — shared platform libraries
- `modules/` — business-domain modules
- `agents/` — AI employees and business automation agents
- `docs/` — architecture and engineering documentation

## Boundary principle

OAE builds and maintains software through governed workflows. BOS provides the business capabilities that those workflows produce and operate.

## Evolution

Features are introduced incrementally. Each feature must be testable, verifiable, and documented where it changes architecture or operational behavior.

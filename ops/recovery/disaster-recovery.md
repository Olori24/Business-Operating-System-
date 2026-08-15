# Disaster recovery runbook

## Recovery objectives
- RPO: define per production environment before launch.
- RTO: define per service tier before launch.

## Procedure
1. Declare incident and freeze risky deployments.
2. Verify latest known-good database backup.
3. Restore into an isolated recovery environment.
4. Apply only validated migrations.
5. Verify tenant isolation, health, readiness and queue integrity.
6. Promote recovery environment after operator approval.
7. Record recovery timestamps and gaps.

## Required evidence
- Backup timestamp
- Restore verification result
- Migration version
- Health/readiness result
- Operator approval

# Production deployment checklist

## Pre-deploy
- CI green on release commit
- Database migrations reviewed and reversible
- Required secrets provisioned through the deployment platform
- Health and readiness endpoints verified
- Backup freshness verified

## Deploy
- Deploy immutable commit
- Run migrations before traffic promotion
- Verify readiness
- Promote gradually

## Rollback
- Stop promotion
- Restore previous application revision
- Do not automatically roll back irreversible database migrations
- Verify readiness and error rate

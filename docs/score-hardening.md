# Score Hardening Notes

The repository treats `npm test` as the dependency-free unit/contract suite and `npm run test:integration` as the PostgreSQL-only suite.

For a clean checkout with Docker available, run:

```bash
npm ci
npm run test:integration:local
```

The local integration runner provisions an isolated PostgreSQL instance, waits for health, runs the integration test, and removes the container and volume afterward.

CI uses the same isolation boundary: unit tests never open a PostgreSQL connection; the dedicated PostgreSQL job provisions its own database.

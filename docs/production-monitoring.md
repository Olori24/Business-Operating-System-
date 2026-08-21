# Hourly production monitoring

The `Production monitoring` workflow runs automatically at **17 minutes past every hour** and can also be started manually from the GitHub Actions interface. It monitors the canonical production URL `https://business-operating-system-pied.vercel.app` unless the workflow-dispatch input or the repository variable `PRODUCTION_URL` overrides it.

## What it checks

The smoke job requests the landing page, onboarding page, dashboard page, health endpoint, metadata endpoint, Google authentication configuration endpoint, and the expected unauthenticated authentication guards. It validates HTTP status codes, page titles, JSON contracts, request IDs, and the absence of an eager Google Identity Services script. Its error rate is the number of failed checks divided by the total number of checks; any failed check fails the job.

The browser-performance job runs three Lighthouse samples against `/start` in a simulated mobile Chromium profile. It evaluates the median of the timing and score metrics, while taking the maximum observed Google Identity Services request count. This reduces false alarms from a single transient CI runner or network spike. The job fails when any of these thresholds are exceeded:

| Metric | Threshold |
|---|---:|
| Performance score | At least 90 |
| First Contentful Paint | At most 1,800 ms |
| Largest Contentful Paint | At most 2,500 ms |
| Cumulative Layout Shift | At most 0.10 |
| Total Blocking Time | At most 200 ms |
| Initial Google Identity Services requests | Exactly 0 |

Each job uploads JSON artifacts retained for 14 days. The artifacts include all three raw Lighthouse runs plus the aggregated summary, providing a time-stamped history of the smoke checks and Lighthouse metrics without requiring a separate database.

## Optional Sentry summary

The workflow includes an optional Sentry job. It runs only when all three of the following are configured:

| Setting | GitHub location | Value |
|---|---|---|
| `SENTRY_AUTH_TOKEN` | Repository secret | Sentry bearer token with the minimum read scope required by the organization stats endpoint. |
| `SENTRY_ORG` | Repository variable | Sentry organization slug. |
| `SENTRY_PROJECT` | Repository variable | Numeric project ID or project identifier accepted by the Sentry stats endpoint. |

The optional job requests the preceding one-hour error event count from Sentry’s organization stats endpoint and uploads the response as an artifact. The workflow does not print the token and does not fail when Sentry is intentionally unconfigured; the deterministic smoke monitor remains the primary deployment signal.

Sentry’s official API documentation describes bearer-token authentication and the organization stats endpoint used here.[1] [2]

## Operations

To run a check immediately, open **Actions → Production monitoring → Run workflow**. The manual input can point the same checks at a staging or alternate production URL without changing repository configuration.

When a scheduled run fails, inspect the failed job first and download its artifact. A smoke-job failure indicates a status, contract, or error-rate regression. A Lighthouse failure indicates a Core Web Vitals, blocking-time, performance-score, or lazy-loader regression. A Sentry-job failure indicates an authentication, project-identifier, permissions, or Sentry API problem.

The workflow is intentionally deterministic and does not send email or chat notifications by itself. Configure GitHub repository notifications or add a dedicated notification step after the error budget and recipient policy are agreed.

## Security notes

Store the Sentry token only as a GitHub Actions repository or environment secret. Keep `SENTRY_ORG`, `SENTRY_PROJECT`, and `PRODUCTION_URL` as repository variables rather than embedding them in scripts. The monitoring workflow has read-only repository permissions and does not mutate deployments, issues, or Sentry state.

## References

[1]: https://docs.sentry.io/api/auth/ "Sentry API authentication"
[2]: https://docs.sentry.io/api/organizations/retrieve-an-organizations-events-count-by-project/ "Sentry organization event-count API"

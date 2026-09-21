# Project Status

Last reviewed: 2026-09-21

## What exists

- Next.js 16, React 19, TypeScript, and Tailwind CSS 4 prototype.
- Parent and child login/dashboard paths.
- Parent creation of child accounts and balance adjustments.
- Child purchase requests with parent approval or denial.
- Simulated daily compound-interest calculation.
- Swappable mock and MongoDB-backed clients. Server routes use the MongoDB Node.js driver; the retired Atlas Data API is no longer required.
- Jest component/model tests and Playwright browser flows.
- Vercel-oriented pull-request Playwright workflow and a Jest workflow.

## Baseline verification

`npm run check` is the canonical local and CI quality gate.

| Check | Result | Detail |
| --- | --- | --- |
| `npm run lint` | Passing | ESLint 9 with the Next.js 16 flat configuration and zero warnings. |
| `npm run typecheck` | Passing | Next route generation and TypeScript complete successfully. |
| `npm run test:unit` | Passing | 7 suites and 25 deterministic tests pass. |
| `npm run build` | Passing | Next.js production build completes successfully. |
| `npm run test:e2e` | Passing | 22 mock-backed Chromium tests pass using a Playwright-managed local server. |
| `npm audit` | Passing | No known dependency vulnerabilities. |
| Mongo Playwright integration | Passing | 22 seeded Chromium tests pass against the fresh Atlas cluster; mutations are scoped to reserved fixture IDs. |

## MongoDB Atlas status

- The unrecoverable, auto-paused M0 deployment was replaced with a fresh free `Cluster0` on MongoDB 8.0 in AWS `us-east-1`.
- Project-level database users and IP access-list entries survived the cluster replacement.
- Local and deployed environments now require `MONGODB_DATABASE` plus either `MONGODB_URI` or the separate `MONGODB_USERNAME`, `MONGODB_PASSWORD`, and `MONGODB_CLUSTER_HOST` variables. Old Data API variables are obsolete.
- `npm run test:e2e:integration` seeds deterministic Playwright-only accounts before running the Mongo-backed browser project. Its cleanup is scoped to the reserved fixture account IDs.

## Highest-priority stabilization work

1. Replace authentication and add server-side family authorization before any public deployment.
2. Validate API inputs and define consistent error responses.
3. Complete the transaction-ledger model so every balance change records before/after balances atomically.
4. Make the live-Mongo Playwright project isolated and safe enough to run as a scheduled integration gate.
5. Add Firefox/WebKit coverage after the core product flows stabilize.

## Product/engineering observations

- The prototype proves the main family interaction, but its present authentication and authorization are development-only.
- The mock-client seam is valuable and should remain, ideally behind application-level ports rather than browser transport details.
- Parent adjustment, request approval, and interest accrual need one consistent transaction-ledger policy.
- Responsive web/PWA is the cheapest way to validate the child experience before committing to a separate native app.

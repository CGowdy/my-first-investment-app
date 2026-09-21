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
| `npm run test:unit` | Passing | 16 suites and 62 deterministic tests pass. |
| `npm run build` | Passing | Next.js production build completes successfully. |
| `npm run test:e2e` | Passing | 22 mock-backed Chromium tests pass using a Playwright-managed local server. |
| `npm audit` | Passing | No known dependency vulnerabilities. |
| Mongo Playwright integration | Passing | 22 seeded Chromium tests pass against the fresh Atlas cluster; mutations are scoped to reserved fixture IDs. |

## MongoDB Atlas status

- The unrecoverable, auto-paused M0 deployment was replaced with a fresh free `Cluster0` on MongoDB 8.0 in AWS `us-east-1`.
- Project-level database users and IP access-list entries survived the cluster replacement.
- Local and deployed Mongo-backed environments now require `MONGODB_DATABASE`, an `AUTH_SECRET` of at least 32 characters, and either `MONGODB_URI` or the separate `MONGODB_USERNAME`, `MONGODB_PASSWORD`, and `MONGODB_CLUSTER_HOST` variables. Old Data API variables are obsolete.
- `npm run test:e2e:integration` seeds deterministic Playwright-only accounts before running the Mongo-backed browser project. Its cleanup is scoped to the reserved fixture account IDs, and the shared Atlas fixture suite runs serially to avoid cross-test contention.

## Highest-priority stabilization work

1. Complete the transaction-ledger model so every balance change records before/after balances atomically.
2. Finish validating API inputs and define a shared error-response contract.
3. Separate application commands and persisted records from browser-facing DTOs.
4. Make the live-Mongo Playwright project safe to run as a scheduled integration gate.
5. Add Firefox/WebKit coverage after the core product flows stabilize.

## Product/engineering observations

- The prototype proves the main family interaction, but account recovery, rate limiting, CSRF policy, and production operations still need explicit designs before public launch.
- Authentication uses bcrypt password hashes and a signed, expiring HttpOnly cookie. Browser storage no longer acts as session authority, and account DTOs cannot contain password material.
- Data-bearing routes enforce guardian-family or child-self authorization on the server. Client-supplied IDs and transaction status fields are not treated as authority.
- Generic transaction deletion is disabled; Mongo integration setup owns fixture cleanup directly.
- Purchase-request approval uses one shared domain decision for mock and Mongo paths, records the approving guardian and time, conditionally transitions a pending request, and updates its before/after ledger values and child balance in one MongoDB transaction. The browser no longer receives a generic balance-overwrite operation.
- The mock-client seam is valuable and should remain, ideally behind application-level ports rather than browser transport details.
- Parent adjustment, request approval, and interest accrual need one consistent transaction-ledger policy.
- Responsive web/PWA is the cheapest way to validate the child experience before committing to a separate native app.

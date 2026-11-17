# Project Status

Last reviewed: 2026-11-17

## What exists

- Next.js 16, React 19, TypeScript, and Tailwind CSS 4 prototype.
- Parent and child login/dashboard paths.
- Persistent light and dark themes across the home, authentication, and dashboard screens.
- Growing Garden visual system across the application shell and responsive journey-style dashboards, with semantic colors for saving, spending, simulated growth, and a guardian attention queue.
- Self-service guardian registration; guardians create child access within their family.
- Parent creation of child accounts and balance adjustments.
- Guardian editing of child names, usernames, optional replacement passwords, simulated interest rates, and practice balances. Profile records update together, while balance edits remain audited adjustments.
- Guardian access to each child's dashboard, including acting on the child's behalf without replacing the signed guardian identity.
- Child purchase requests with parent approval or denial.
- Child spending and simulated-growth reports derived from completed ledger activity.
- A responsive long-term Pretend Zone graph comparing the current path with a hypothetical balance change over 30 days, one year, or five years without persisting the scenario.
- A portfolio-ready landing page and one-click parent/child demo with fictional activity, visitor-isolated tab storage, refresh persistence, and an explicit reset.
- Lazy simulated daily compound-growth settlement with no scheduler or background jobs.
- Swappable mock and MongoDB-backed clients. Server routes use the MongoDB Node.js driver; the retired Atlas Data API is no longer required.
- Jest component/model tests and Playwright browser flows.
- Vercel-oriented pull-request Playwright workflow and a Jest workflow.

## Baseline verification

`npm run check` is the canonical local and CI quality gate.

| Check | Result | Detail |
| --- | --- | --- |
| `npm run lint` | Passing | ESLint 9 with the Next.js 16 flat configuration and zero warnings. |
| `npm run typecheck` | Passing | Next route generation and TypeScript complete successfully. |
| `npm run test:unit` | Passing | 33 suites and 145 deterministic tests pass. |
| `npm run build` | Passing | Next.js production build completes successfully. |
| `npm run test:e2e` | Passing | 41 mock-backed Chromium tests pass using a Playwright-managed local server. |
| `npm audit` | Passing | No known dependency vulnerabilities. |
| Mongo Playwright integration | Passing | 25 seeded Chromium tests pass against the fresh Atlas cluster; mutations are scoped to reserved fixture IDs and usernames. |

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
- Account creation temporarily accepts any non-empty password for prototype testing; the shared policy is explicitly marked for replacement before public launch.
- Mock and Mongo-backed development can provide documented `test-adult` and `test-child` manual-test fixtures without using real family credentials.
- Data-bearing routes enforce guardian-family or child-self authorization on the server. Client-supplied IDs and transaction status fields are not treated as authority.
- Generic transaction deletion is disabled; Mongo integration setup owns fixture cleanup directly.
- Purchase-request approval uses one shared domain decision for mock and Mongo paths, records the approving guardian and time, conditionally transitions a pending request, and updates its before/after ledger values and child balance in one MongoDB transaction. The browser no longer receives a generic balance-overwrite operation.
- Purchase-request approval and denial responses refresh the guardian's family-wide pending queue, so acting on one child's request cannot hide a sibling's requests until the next login.
- Parent balance adjustments use one shared domain decision for mock and Mongo paths and atomically write the audited ledger entry with the resulting child balance. The API now identifies the adjusted child explicitly in its route.
- Child provisioning rejects duplicate usernames and atomically creates the child profile, login identity, and audited opening-balance entry.
- Child profile editing checks guardian ownership, settles pending growth under the previous interest rate, preserves an omitted password, hashes replacements server-side, and atomically keeps the login identity and child profile in sync. Balance edits derive an audited adjustment from the authoritative settled balance rather than directly overwriting it or trusting a stale browser-side delta.
- Simulated growth is calculated only on existing authenticated reads or immediately before a balance mutation. Completed 24-hour UTC periods are compounded into one atomic ledger entry, so inactive accounts produce no serverless invocations.
- The mock-client seam is valuable and should remain, ideally behind application-level ports rather than browser transport details.
- Parent adjustments, request approvals, and simulated growth now share the same atomic transaction-ledger policy.
- Responsive web/PWA is the cheapest way to validate the child experience before committing to a separate native app.

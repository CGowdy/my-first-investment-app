# My First Investment App: Agent Guide

## Product intent

This is a family financial-learning simulator. No real money is held, invested, or transferred. Parents administer child accounts; children practice saving, simulated growth, budgeting, and purchase requests.

Read `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, and `docs/PROJECT_STATUS.md` before making product or architectural changes.

## Non-negotiable rules

- Treat children, credentials, and family data as sensitive even though balances are simulated.
- Never add real-money movement, brokerage, payment, bank-linking, or financial-advice behavior without an explicit product decision.
- Never log, commit, expose to the browser, or include in fixtures real credentials or MongoDB secrets.
- Do not preserve the prototype's plaintext-password approach in new code. Authentication must be redesigned before any public or multi-family use.
- Make parent authorization explicit for every child-account mutation. A user-supplied ID is not authorization.
- Preserve the user's uncommitted work. Inspect `git status` and relevant diffs before editing.

## Repository map

- `app/`: Next.js App Router UI, route handlers, contexts, domain-shaped interfaces, and data clients.
- `app/clients/`: browser-facing `IClient` implementations for mock and Mongo-backed APIs.
- `app/api/`: HTTP route handlers that translate requests and responses.
- `app/server/`: server-only application services, authentication, and database adapters.
- `tests/e2e/`: Playwright flows; `mock*` tests are preferred for local deterministic work.
- `docs/`: product intent, architecture, and current technical status.

## Working conventions

- Prefer small vertical slices with one clear behavior and focused tests.
- Keep business rules independent of React, route handlers, and MongoDB so a future mobile client can reuse the same API semantics.
- Use server-side authorization and validation at trust boundaries. Client checks are only presentation.
- Keep mock and production-backed client behavior aligned.
- Use deterministic dates, balances, and IDs in tests; do not use random values or fixed sleeps.
- Do not mix currency units. Existing balances use JavaScript numbers in display units; record and test any migration before introducing integer minor units.
- Update the relevant document when changing product vocabulary, boundaries, API contracts, or known project status.

## Commands and verification

```powershell
npm ci
npm run dev
npm run check
```

The default Playwright gate starts its own local server and runs mock-backed Chromium tests. `PLAYWRIGHT_TEST_BASE_URL` is only needed to target an existing server or deployment. Mongo-backed end-to-end tests touch shared external data; use `npm run test:e2e:integration` only when the task explicitly requires integration coverage.

Before handing off, report exactly which checks passed, failed, or were not run.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

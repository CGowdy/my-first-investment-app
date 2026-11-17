# My First Investment App

A family financial-learning simulator for practicing saving, budgeting, simulated growth, and purchase decisions without holding or moving real money.

Parents use the app to manage child profiles, record balance changes, and review purchase requests. Children use a fast, phone-friendly experience to see their progress, explore tradeoffs, and ask to spend what they have saved.

## Current state

This is an early Next.js prototype, not a production financial or child-account system. The main parent/child flow exists, backed by either an isolated browser demo or MongoDB Atlas through the server-side MongoDB driver. Mongo-backed authentication uses bcrypt password hashes, signed HttpOnly sessions, and family-scoped authorization; account recovery, rate limiting, and production operations still need explicit designs before the app stores real family data.

## Public portfolio demo

The public demo runs with `ENVIRONMENT=mock`. Visitors can enter a fictional parent or child experience with one click, and changes are stored only in that browser tab. Refreshing preserves the visitor's demo session; **Reset demo** restores the original fictional family. The deployed demo must not receive MongoDB credentials or connect to real family data.

See:

- [`docs/PRODUCT.md`](docs/PRODUCT.md) for the vision, vocabulary, scope, and open decisions.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the current design, risks, and intended web/mobile direction.
- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) for implemented features and the latest verification baseline.
- [`AGENTS.md`](AGENTS.md) for repository conventions used by human and AI contributors.

## Stack

- Next.js 16 App Router and React 19
- TypeScript
- Tailwind CSS 4
- Next.js route handlers
- MongoDB Atlas through the server-side MongoDB Node.js driver, with an in-memory mock client for local flows
- Jest and Testing Library
- Playwright

## Local setup

1. Install dependencies:

   ```powershell
   npm ci
   ```

2. Copy `.env.example` to `.env.local`. Keep `ENVIRONMENT=mock` for local UI work that should not call MongoDB. Mongo-backed work additionally requires the server-only MongoDB username, password, cluster host, database, and a random `AUTH_SECRET` of at least 32 characters. A complete `MONGODB_URI` may be used instead. Generate a private local session secret without printing it by running `npm run setup:auth-secret`.

3. Start the application:

   ```powershell
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

The mock accounts currently defined in `app/clients/mockClient.ts` are:

| Role | Username | Password |
| --- | --- | --- |
| Parent | `parent1` | `pass123` |
| Child | `child1` | `pass123` |
| Parent manual tester | `test-adult` | `test-pass-123` |
| Child manual tester | `test-child` | `test-pass-123` |

These are public development fixtures. The portfolio demo exposes one-click entry for `parent1` and `child1`; they are not credentials suitable for a Mongo-backed environment.

Guardian accounts can also be created from the dashboard sign-in card. A signed-in guardian creates child access from **Create Child Account**, which keeps the child linked to the correct family. To create or reset the same `test-adult` and `test-child` fixtures in the configured MongoDB development database, run:

```powershell
npm run db:seed:manual
```

The manual seed is idempotent: it refreshes the two fixture login passwords without resetting the child balance or transaction history. It refuses to modify a same-named account that was not created as one of these fixtures.

## Verification

```powershell
npm run check
```

The check command runs ESLint, generated-route TypeScript checks, unit tests, a production build, and mock Chromium browser tests. Playwright starts the local development server automatically.

Install the matching Chromium binary after a fresh Playwright update:

```powershell
npm run playwright:install
```

Run live MongoDB scenarios separately because they require credentials and may change shared test data:

```powershell
npm run test:e2e:integration
```

The integration command first upserts deterministic Playwright-only accounts and clears transactions owned by those fixture account IDs. It does not touch other families or collections.

## Development approach

Build small, testable vertical slices. Keep financial-learning rules outside React components and database adapters so the same backend semantics can support the parent web experience and a future child mobile client. Treat family and child data as sensitive even though all balances are simulated.

# Architecture

## Current prototype

The repository is a single Next.js 16 App Router application:

```text
React pages and components
        |
ClientContext -> IClient
        |              |
   MockClient     MongoDbClient
                       |
              Next.js route handlers
                       |
        Server application services
                       |
             MongoDB adapter
                       |
          MongoDB Node.js driver
```

`AuthContext` restores a server-issued, signed HttpOnly session into React state through the selected data client. The dashboard selects a child or parent view from `isChildAccount`. `IClient` provides a replaceable browser-side data facade, which is useful for deterministic tests, but currently mixes transport concerns with application operations.

Guardian child-dashboard mode is presentation state owned by the dashboard page. It renders a guardian-owned child profile through the child UI without replacing the signed guardian session. The same child-facing commands remain available, but server routes authorize the guardian-family relationship explicitly and record the signed guardian as the actor when a guardian acts on the child's behalf.

The data model centers on users, child accounts, and transactions. Usernames are protected by the unique `users_username_unique` database index. Balances are also stored directly on child accounts, while transactions provide a partial history. Simulated growth is settled lazily during authenticated account reads and before balance mutations.

Guardian child-profile edits first settle or checkpoint pending growth under the prior interest rate, then update the login identity and child-account projection in one MongoDB transaction after an ownership check. Password replacement is optional and is hashed server-side; password material is never returned to the browser. A requested balance edit is deliberately a separate audited target-balance command that derives its adjustment from the authoritative settled balance, so profile editing cannot bypass the transaction ledger or apply a stale browser-side delta.

Lazy growth settlement uses no scheduler or background invocation. A request that already needs an account calculates completed 24-hour UTC periods since `balanceLastUpdated`; if at least one cent is due, the app writes one explanatory growth transaction and the resulting balance atomically. Multiple inactive days collapse into one entry, while partial days remain pending. Principal-changing commands checkpoint at the mutation time so a new principal is never applied retroactively.

Child reports are read models derived from the authorized transaction ledger after settling current growth. Approved purchase requests feed the spending summary; system-authored growth entries feed the interest-growth summary. Long-term Pretend Zone projections are pure domain calculations sampled into a bounded set of chart points and never write account or transaction data.

## Current boundaries

| Area | Location | Responsibility today |
| --- | --- | --- |
| UI | `app/components`, `app/dashboard` | Login, dashboards, forms, and request actions |
| Client state | `app/context` | Selected data client and browser-side session |
| Client gateway | `app/clients` | Mock behavior or HTTP calls to route handlers |
| HTTP API | `app/api` | HTTP request parsing, authorization entry points, response translation, and server-operation coordination |
| Server services | `app/server` | Server-only application orchestration, authentication, and persistence adapters |
| Data adapter | `app/server/database/mongodb.ts` | Server-only MongoDB driver access and legacy response-shape compatibility |
| Domain rules | `app/domain` | Framework-independent decisions such as request approval and resulting balance changes |
| Domain-shaped types | `app/models` | Users, child accounts, transactions, and client-facing contracts |
| Browser flows | `tests/e2e` | Mock and live-Mongo Playwright scenarios |

## Main architectural risks

1. Several API boundaries still need a shared validation and error-response contract.
2. MongoDB response shapes and ObjectId representations still leak through application code. The adapter currently preserves the retired Data API response envelope to keep this migration narrow.
3. Some business behavior remains spread across components, clients, and route handlers instead of application services.
4. Floating-point currency remains a risk even though growth calculations now use injected UTC timestamps and round credited amounts to cents.
5. A future mobile app would have to depend on unstable, web-shaped endpoints unless an explicit API contract is established.

## Target direction

Keep one backend and two eventual clients:

```text
Parent/guardian web       Child mobile or installable web app
          \                 /
           Versioned application API
                      |
        authenticated application services
                      |
      domain rules + append-only transaction ledger
                      |
              database repositories
```

Recommended sequencing:

1. Stabilize the existing web prototype and make mock flows deterministic.
2. Define the family/guardian/child authorization model and replace prototype authentication.
3. Establish validated API contracts and a single representation for IDs, dates, statuses, and money.
4. Make transactions the auditable source of balance changes, with atomic writes or database transactions.
5. Extract framework-independent domain rules for requests, approvals, balance changes, and growth.
6. Make the responsive child experience excellent, then choose whether a PWA is sufficient or a native shell is justified.

## Design constraints for new work

- Route handlers translate HTTP; they should not own core financial-learning rules.
- Data-bearing routes must authorize the signed session against the requested family or child resource; path and body IDs are never authorization.
- UI components render state and collect intent; they should not directly enforce authorization or ledger invariants.
- Every balance-affecting command should produce one durable ledger entry with actor, reason, timestamp, amount, and resulting balance.
- Status changes should be explicit valid transitions, not arbitrary numeric enum updates.
- Store timestamps in UTC and inject a clock into time-dependent domain logic and tests.
- Prefer a schema validator at every API boundary and return consistent error objects.
- Keep persisted types separate from API DTOs and UI view models.
- Treat the future mobile client as a consumer of the same application API, not a second implementation of the rules.

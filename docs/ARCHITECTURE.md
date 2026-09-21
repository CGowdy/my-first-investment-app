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
          MongoDB Node.js driver
```

`AuthContext` restores a server-issued, signed HttpOnly session into React state through the selected data client. The dashboard selects a child or parent view from `isChildAccount`. `IClient` provides a replaceable browser-side data facade, which is useful for deterministic tests, but currently mixes transport concerns with application operations.

The data model centers on users, child accounts, and transactions. Balances are also stored directly on child accounts, while transactions provide a partial history. Interest is calculated during child login.

## Current boundaries

| Area | Location | Responsibility today |
| --- | --- | --- |
| UI | `app/components`, `app/dashboard` | Login, dashboards, forms, and request actions |
| Client state | `app/context` | Selected data client and browser-side session |
| Client gateway | `app/clients` | Mock behavior or HTTP calls to route handlers |
| HTTP API | `app/api` | Request parsing and MongoDB operations |
| Data adapter | `app/api/mongoDataAPIHelper.ts` | Server-only MongoDB driver access and legacy response-shape compatibility |
| Domain rules | `app/domain` | Framework-independent decisions such as request approval and resulting balance changes |
| Domain-shaped types | `app/models` | Users, child accounts, transactions, balance calculation |
| Browser flows | `tests/e2e` | Mock and live-Mongo Playwright scenarios |

## Main architectural risks

1. Child creation and login-time interest still use separate writes; request approval and parent adjustments now update their ledger records and child balances in MongoDB transactions.
2. Several API boundaries still need a shared validation and error-response contract.
3. MongoDB response shapes and ObjectId representations still leak through application code. The adapter currently preserves the retired Data API response envelope to keep this migration narrow.
4. Business behavior is spread across components, clients, route handlers, and login side effects.
5. Floating-point currency and time-dependent interest calculations can produce surprising results.
6. A future mobile app would have to depend on unstable, web-shaped endpoints unless an explicit API contract is established.

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

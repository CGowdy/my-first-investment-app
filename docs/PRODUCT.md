# Product Brief

## Vision

My First Investment App gives families a safe, lightweight place to practice money decisions together. It should make abstract ideas—saving, compound growth, tradeoffs, patience, and budgeting—visible without putting real money at risk.

The app records a family's agreed-upon simulated balance. If a child saves enough for a real purchase, the parent may fulfill it outside the app and record the corresponding withdrawal. The app itself does not custody funds or execute purchases.

## People and jobs

### Parent or guardian

- Create and manage child profiles.
- Record deposits, withdrawals, allowances, and corrections.
- Choose understandable simulated growth rules.
- Review, approve, or decline purchase requests.
- Explain how a decision changes the child's goals and balance.
- Open a child profile's dashboard and act on the child's behalf while retaining the guardian identity for authorization and audit history.

### Child

- Quickly see what is available, saved, pending, and recently changed.
- See understandable summaries of approved spending and recorded simulated growth.
- Move simulated money among clearly named goals or buckets.
- Ask to spend money and explain why.
- Explore what could happen by saving, spending, or waiting.
- Compare long-term pretend choices on a graph without changing the account.
- Learn from feedback without feeling like the app is a bank or a game of chance.

## Product principles

1. **Learning over realism.** Model only enough financial behavior to teach a concept clearly.
2. **Parent-guided autonomy.** Children can explore and request; guardians control consequential changes.
3. **Explain every number.** A balance change should have a visible source, time, reason, and resulting balance.
4. **Safe by construction.** Collect little personal data, use age-appropriate language, and never imply that simulated returns are guaranteed real-world returns.
5. **Fast child experience.** Common child actions should fit comfortably on a phone and take only a few taps.
6. **Calm parent experience.** Administration and review should be efficient on the web and remain usable on mobile.

## Core vocabulary

- **Family:** the ownership and authorization boundary for guardians and children.
- **Guardian:** an adult who administers a family and approves child requests.
- **Child profile:** a child-facing identity owned by a family.
- **Account:** a simulated store of value for a child.
- **Transaction:** an immutable explanation of a balance change or requested change.
- **Purchase request:** a child's proposal to spend a specific amount for a stated reason.
- **Growth rule:** a clearly labeled simulation that changes an account over time.
- **Goal/bucket:** an optional allocation such as Save, Spend, Give, or a named purchase goal.

Use these terms in new product work. Existing code uses `ParentAccount`, `ChildAccount`, `Transaction`, and `interest`; migrate deliberately rather than renaming piecemeal.

## MVP outcome

A family can create guardian and child access, record simulated funds, see a trustworthy ledger and balance, submit and review purchase requests, and explore simple growth scenarios from a responsive web app. The backend contract should be designed so a dedicated child mobile app can be added later without duplicating business rules.

## Explicit non-goals for the first release

- Holding or moving real money.
- Connecting banks, cards, brokerages, or payment processors.
- Buying securities or tracking a real investment portfolio.
- Personalized financial, tax, or investment advice.
- Social feeds, public profiles, ads, or child-to-child transfers.

## Open product decisions

- Whether balances represent a parent's real-world promise, purely fictional points, or a family-selectable mode.
- Which buckets are built in and whether children may create their own goals.
- Appropriate child sign-in by age: PIN, passkey/device link, guardian-assisted access, or another low-data method.
- Whether purchases reduce the balance at approval, fulfillment, or a separate completion step.
- Whether multiple guardians and multiple families per guardian are required for MVP.

## Simulated growth rule for the MVP

- A guardian chooses one annual percentage rate for each child account.
- Growth compounds once per completed 24-hour UTC period and is rounded to cents when credited.
- The app settles all elapsed days in one entry when the account is next viewed or before its balance changes. It does not run scheduled or background jobs for inactive accounts.
- Long-term Pretend Zone projections use the same daily-compounding formula but are never persisted and never change the account or ledger.
- Growth is educational and simulated. The interface must not present it as a guaranteed real-world return.

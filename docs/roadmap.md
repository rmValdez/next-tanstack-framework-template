# Roadmap

The work ahead, in order. Each step lists its tasks, what is already known, and the check that
closes it. What has been built so far, with its test results and gotchas, is in
[build-log.md](build-log.md). Why each choice was made: [decisions.md](decisions.md).

**Order (agreed 2026-10-06):** ~~1 database separation + app-to-app auth~~ ✅ → ~~2 global sign-out~~ ✅ →
~~3 exam on TanStack Start~~ ✅ → ~~4 new apps~~ ✅ → 5 events.

**Standing rule for every step:** `pnpm dev` starts every app and each UI app reaches its landing
page without errors; `pnpm type-check`, `pnpm lint` and `pnpm build` pass; commit at the end of the
step (no Claude co-author trailers).

---

## Step 1: one database per domain + Finance → HR API (D17, D18) ✅

Done 2026-10-07. What was built, how it was verified and the gotchas: [build log](build-log.md),
step 1.

---

## Step 2: global sign-out (D19) ✅

Done 2026-10-07 with OIDC Back-Channel Logout. [Build log](build-log.md), step 2.

---

## Step 3: exam on TanStack Start ✅

Done 2026-10-07. [Build log](build-log.md), step 3. `apps/exam` is now the template for
`collaboration` and `workspace`.

---

## Step 4: new apps ✅

Done 2026-10-07: `crm` (5017), `operations` (5018), `analytics` (5019) on Next.js from
`apps/recruitment`, `collaboration` (5020), `workspace` (5021) on TanStack Start from `apps/exam`.
[Build log](build-log.md), step 4.

---

## Step 5: Bounded Contexts Consolidation & Automated Boundaries (D21)

- **Production consolidation:** organize the 10 domain apps into 5 high-cohesion domain services:
  `people` (:5010), `finance` (:5013), `business` (:5017), `workplace` (:5020), `exam` (:5016 - learning),
  `analytics` (:5019), alongside `accounts` (:5011) and `worker` (:5012).
- **Automated DB Isolation Rule:** enforce via ESLint `no-restricted-imports` that `apps/<context>` can
  **never** import any database package other than its own `@workspace/<context>-db`.
- **Extraction Path documented:** maintain the recipe for splitting sub-modules (e.g. `recruitment`) into
  independent microservices when scale demands it.

---

## Step 6: events (D16)

- `@workspace/core/events`: exchange `domain.events`, versioned event schemas, publisher (from an
  outbox), consumer helper (retry, DLQ, inbox).
- First flows: `people` publishes `employee.created.v1` → finance (ledger/payroll entry), attendance;
  analytics read models fed by events.
- Synchronous checks (REST + M2M JWT) remain for immediate dependency queries (e.g. Finance checking employee status).

**Done when:** domain event emits from People, reaches Finance and Analytics exactly once, surviving
broker outages (outbox) and redeliveries (inbox).

---

## Not scheduled

- Authorization beyond "signed in" (roles per app; HR owns company administration).
- Realtime transport for collaboration/attendance (Socket.IO or WebSocket inside the Start apps).
- Per-app Dockerfiles, CI.

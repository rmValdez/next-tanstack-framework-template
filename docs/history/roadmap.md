# Roadmap

The work ahead, in order. Each step lists its tasks, what is already known, and the check that
closes it. What has been built so far, with its test results and gotchas, is in
[build-log.md](build-log.md). Why each choice was made: [../architecture/decisions.md](../architecture/decisions.md).

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

## The Final Architecture Plan (ADR D22)

We are consolidating the system into **6 business bounded contexts plus 1 infrastructure app**:
- `accounts` (:5011, `accounts_db`) — Identity, Authentication, OIDC
- `people` (:5010, `people_db`) — HR, Recruitment, Exam / Assessment
- `workforce` (:5013, `workforce_db`) — Attendance, Payroll, Financial Ledger
- `business` (:5017, `business_db`) — CRM, Marketplace, Operations
- `workplace` (:5020, `workplace_db`, TanStack Start) — Collaboration, Workspace
- `analytics` (:5019, `analytics_db`) — Reporting, Read Models
- `worker` (:5012) — Background Jobs, Messaging Infrastructure

---

## 9-Step Implementation Roadmap

### Step 1 — Lock the bounded-context architecture ✅
- [x] Create and approve ADR D22 defining the 6 contexts + Worker.
- [x] Document strict database ownership and boundary rules.

### Step 2 — Enforce database boundaries 🟡 (In Progress)
- [x] ESLint `no-restricted-imports` active on `apps/people`.
- [ ] Add matching ESLint isolation rules to `accounts`, `workforce`, `business`, `workplace`, and `analytics`.

### Step 3 — Consolidate databases
- [ ] Merge `attendance` + `finance` models into `packages/workforce-db` (`workforce_db`).
- [ ] Add `Exam`, `Question`, `ExamAttempt` models to `packages/people-db` (`people_db`). Drop standalone `exam_db`.
- [ ] Merge `crm` + `operations` + `Marketplace` models into `packages/business-db` (`business_db`).
- [ ] Merge `collaboration` + `workspace` models into `packages/workplace-db` (`workplace_db`).

### Step 4 — Consolidate applications
- [ ] Rename/refactor `apps/finance` $\to$ `apps/workforce` (:5013). Move attendance feature here.
- [ ] Move assessment/exam capability into `apps/people` (:5010). Remove `apps/exam`.
- [ ] Merge `crm` and `operations` into `apps/business` (:5017).
- [ ] Merge `collaboration` and `workspace` into `apps/workplace` (:5020).

### Step 5 — Fix internal imports, routes & config
- [ ] Update ports in `packages/core/src/urls.ts` and `.env.example`.
- [ ] Update accounts seed `CLIENTS` and `trustedOrigins`.
- [ ] Update `docker-compose.yml` / `init.sql` for the 6 databases.
- [ ] Update `turbo.json`.

### Step 6 — Add Marketplace to Business
- [ ] Add Marketplace feature (`Product`, `Listing`, `Order`, `OrderItem`, `Review`) inside `apps/business`.

### Step 7 — Implement domain events (`@workspace/core/events`)
- [ ] Build `EventEnvelope`, event schemas, versioning (`v1`), transport interfaces.
- [ ] Wire RabbitMQ topic exchange `domain.events`.

### Step 8 — Implement Outbox / Inbox
- [ ] Add `outbox` and `inbox` tables to `people_db`, `workforce_db`, `business_db`.
- [ ] Worker polls/relays outbox to RabbitMQ.
- [ ] Consuming domains process events idempotently via inbox.

### Step 9 — Implement real cross-context domain events
- [ ] Flow 1: `people.employee.hired.v1` $\to$ Workforce (create worker/payroll profile) & Analytics.
- [ ] Flow 2: `business.order.completed.v1` $\to$ Workforce (financial record) & Analytics.
- [ ] Flow 3: `workforce.payroll.completed.v1` $\to$ Analytics.
- Realtime transport for collaboration/attendance (Socket.IO or WebSocket inside the Start apps).
- Per-app Dockerfiles, CI.

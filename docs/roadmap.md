# Roadmap

The work ahead, in order. Each step lists its tasks, what is already known, and the check that
closes it. What has been built so far, with its test results and gotchas, is in
[build-log.md](build-log.md). Why each choice was made: [decisions.md](decisions.md).

**Order (agreed 2026-10-06):** ~~1 database separation + app-to-app auth~~ ✅ → ~~2 global sign-out~~ ✅ →
~~3 exam on TanStack Start~~ ✅ → 4 new apps → 5 events.

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

## Step 4: new apps

Scaffold, sign-in only, no features, each with `<app>_db`, role, OAuth client, port:

| App             | Framework      | Copy from                | Port (proposed) |
| :-------------- | :------------- | :----------------------- | :-------------- |
| `crm`           | Next.js        | `apps/hr` minus features | 5017            |
| `operations`    | Next.js        | `apps/hr` minus features | 5018            |
| `analytics`     | Next.js        | `apps/hr` minus features | 5019            |
| `collaboration` | TanStack Start | `apps/exam`              | 5020            |
| `workspace`     | TanStack Start | `apps/exam`              | 5021            |

The scaffolding recipe is in [adding-a-service.md](adding-a-service.md).

**Done when:** all apps come up under one `pnpm dev`, landing pages load, sign-in and global
sign-out work for each.

---

## Step 5: events (D16)

- `@workspace/core/events`: exchange `domain.events`, versioned event schemas, publisher (from an
  outbox), consumer helper (retry, DLQ, inbox).
- First flows: recruitment `candidate.hired.v1` → HR creates the employee; HR `employee.created.v1`
  → finance, attendance; analytics read models fed by events.
- Recruitment features (candidates, vacancies) are built here, since the flow needs them.

**Done when:** a hire in recruitment creates the employee in HR exactly once, survives a broker
outage (outbox) and a redelivery (inbox).

---

## Not scheduled

- Real features for recruitment, attendance, crm, operations, analytics, collaboration, workspace.
- Authorization beyond "signed in" (roles per app; HR owns company administration).
- Realtime transport for collaboration/attendance (Socket.IO or WebSocket inside the Start apps).
- Per-app Dockerfiles, CI.

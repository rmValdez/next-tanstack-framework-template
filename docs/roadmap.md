# Roadmap

The work ahead, in order. Each step lists its tasks, what is already known, and the check that
closes it. What has been built so far, with its test results and gotchas, is in
[build-log.md](build-log.md). Why each choice was made: [decisions.md](decisions.md).

**Order (agreed 2026-10-06):** ~~1 database separation + app-to-app auth~~ ✅ → 2 global sign-out →
3 exam on TanStack Start → 4 new apps → 5 events.

**Standing rule for every step:** `pnpm dev` starts every app and each UI app reaches its landing
page without errors; `pnpm type-check`, `pnpm lint` and `pnpm build` pass; commit at the end of the
step (no Claude co-author trailers).

---

## Step 1: one database per domain + Finance → HR API (D17, D18) ✅

Done 2026-10-07. What was built, how it was verified and the gotchas: [build log](build-log.md),
step 1.

---

## Step 2: global sign-out (D19)

- Verify in `@better-auth/oauth-provider` 1.7.7 whether back-channel logout is supported (the
  `oauthClient.backchannelLogoutUri` / `backchannelLogoutSessionRequired` fields suggest it).
- If yes: seed each client's `backchannelLogoutUri` (`{app}/api/auth/backchannel-logout` or the
  route the library expects); each app handles the logout token (verify signature, `aud`, `sid` /
  `sub`) and deletes that user's local sessions.
- If no: build it. Accounts, on end-session / sign-out, POSTs a signed logout token to every
  client's URI; each app verifies with JWKS and deletes sessions for the `sub`.
- UI: one "Sign out" that ends everything (keep "sign out of this app only" only if wanted).

**Done when:** signed in to hr, finance and exam; sign out in finance; hr and exam both require
sign-in on the next request.

---

## Step 3: exam on TanStack Start

- Replace `apps/exam` (currently a Next.js copy of hr) with a TanStack Start app on port 5016:
  TanStack Router, Query, Form; Better Auth with `genericOAuth` and `tanstackStartCookies()`
  (philgeps' `apps/philgeps/src/lib/auth.ts` is a working reference on Better Auth 1.6), same
  `exam_db` package, `cookiePrefix: "exam"`, same OAuth client.
- Landing page, `/sso/start` equivalent, protected dashboard, sign-out, `/api/health`.
- `pnpm dev`, `build`, `type-check`, `lint` work for it (Vite/Nitro scripts, ESLint config).
- This becomes the template for `collaboration` and `workspace`.

**Done when:** exam runs under `pnpm dev` beside the Next apps, the SSO round-trip and global
sign-out work exactly as for hr.

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

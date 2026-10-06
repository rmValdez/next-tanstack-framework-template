# Roadmap

The work ahead, in order. Each step lists its tasks, what is already known, and the check that
closes it. What has been built so far, with its test results and gotchas, is in
[build-log.md](build-log.md). Why each choice was made: [decisions.md](decisions.md).

**Order (agreed 2026-10-06):** 1 database separation + app-to-app auth → 2 global sign-out →
3 exam on TanStack Start → 4 new apps → 5 events.

**Standing rule for every step:** `pnpm dev` starts every app and each UI app reaches its landing
page without errors; `pnpm type-check`, `pnpm lint` and `pnpm build` pass; commit at the end of the
step (no Claude co-author trailers).

---

## Step 1: one database per domain + Finance → HR API (D17, D18)

**Starting point:** domains live in `company_db` (one schema each). Finance reads employees through
the view `hr_public.employee_directory_v1`, granted by HR's migration
`*_grant_public_views_to_finance`.

### 1a. Databases

Replace `docker/postgres/init.sql` with (written and reviewed on 2026-10-06, not yet applied):

```sql
CREATE DATABASE accounts_db;

CREATE ROLE hr_app LOGIN PASSWORD 'hr_pw';
CREATE DATABASE hr_db OWNER hr_app;
CREATE DATABASE hr_shadow OWNER hr_app;  -- `prisma migrate dev` only
-- same three lines for finance, recruitment, attendance, exam

-- Postgres lets every role connect to every database by default; only the owner may.
REVOKE CONNECT ON DATABASE hr_db, hr_shadow FROM PUBLIC;
-- same for every domain
```

Keep the header comment explaining D17. The `<app>_shadow` databases and `<app>_app` roles already
exist in the running container; `<app>_db` databases do not.

Then, per domain package (`packages/<app>-db`):

- `prisma/schema.prisma`: remove `schemas = [...]` and every `@@schema(...)`; finance also drops
  `previewFeatures = ["views"]` and the `EmployeeDirectory` view model. Update the header comment.
- Delete `prisma/migrations/` and create a fresh baseline: `pnpm prisma migrate dev --name init`
  (no data to keep). HR loses `*_public_views` and `*_grant_public_views_to_finance`.
- `prisma.config.ts`: comments mention `?schema=`; update.
- `.env` and `.env.example`: `<APP>_DATABASE_URL=postgresql://<app>_app:<app>_pw@localhost:5000/<app>_db`
  and `<APP>_SHADOW_DATABASE_URL=...@localhost:5000/<app>_shadow` (no `?schema=`).
  The user edited `.env` by hand; change only these lines.
- Running container: create the `<app>_db` databases owned by their roles and revoke `CONNECT`
  (or `docker compose down -v` + `pnpm db:setup` for a clean start, which deletes local data).
  Drop `company_db` and the leftover `web_db` afterwards.
- `pnpm db:generate`, `pnpm --filter @workspace/hr-db db:seed`, re-run accounts seed.

### 1b. App-to-app auth (finance calls HR)

Researched in `@better-auth/oauth-provider` 1.7.7 (not yet tried):

- `oauthProvider` options: `scopes` (default `openid profile email offline_access`; add
  `hr:employees.read`), `resources: [{ identifier, name, allowedScopes, accessTokenTtl }]`,
  `resourceSeedMode` (`insertOnly` default; use `overwrite` or `merge` so config wins),
  `enforcePerClientResources` (default `true`: clients must be linked via `oauthClientResource`),
  `m2mAccessTokenExpiresIn` (default 3600).
- Resource identifiers must be absolute URIs (RFC 8707), e.g. `http://localhost:5010/api/v1`
  (derive from `NEXT_PUBLIC_HR_URL`).
- `oauthClient` has `grantTypes` and `clientCredentialsScopes`; the seed sets finance to
  `["authorization_code", "refresh_token", "client_credentials"]` with
  `clientCredentialsScopes: ["hr:employees.read"]` and inserts an `oauthClientResource` row
  (`clientId: "finance"`, `resourceId: <hr identifier>`).
- Token request (finance server): `POST {accounts}/api/auth/oauth2/token`, Basic auth with the
  finance client credentials, `grant_type=client_credentials&scope=hr:employees.read&resource=<id>`.
  Cache the token until shortly before `expires_in`.
- Verification (HR): `oauthProviderResourceClient().getActions().verifyBearerToken(token, {
jwksUrl: {accounts}/api/auth/jwks, verifyOptions: { issuer: {accounts}/api/auth, audience: <id> },
requiredScopes: ["hr:employees.read"] })` from `@better-auth/oauth-provider/resource-client`.
  HR needs `@better-auth/oauth-provider` as a dependency.

Build:

- HR: `GET /api/v1/employees` (list: id, employeeNo, fullName, departmentName, status) and
  `GET /api/v1/employees/[id]`, bearer-only (401 without/invalid token, 403 wrong scope). Keep the
  session-based `/api/employees` for HR's own UI.
- Finance: `src/lib/hr-client.ts` (token cache + typed fetch). `features/payroll/server.ts` replaces
  `financeDb.employeeDirectory` with the HR client; payroll create checks the employee via
  `GET /api/v1/employees/[id]`. If HR is down, the payroll page shows a clear error.
- Optional: the user's `.env` has `ACCESS_TOKEN_EXPIRY` / `REFRESH_TOKEN_EXPIRY` (unused). Ask
  whether they should drive `accessTokenExpiresIn` / `refreshTokenExpiresIn` in accounts.

**Done when:** each domain connects only to its own `<app>_db` (`finance_app` cannot connect to
`hr_db`); the finance e2e passes again (list employees from HR, payroll 201/409/400, unknown and
terminated employee rejected, HR rename visible); HR's `/api/v1/employees` rejects no token, a
token for another audience, and a token without the scope.

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

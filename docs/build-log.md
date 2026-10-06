# Build Log

What has been built, phase by phase, with the check that closed each phase and the gotchas found on
the way. Work still ahead is in [roadmap.md](roadmap.md). Paths and names are as they were when the
phase was built; later decisions ([decisions.md](decisions.md)) say what changed since.

| Phase | What                                                                        | Date       |
| :---- | :-------------------------------------------------------------------------- | :--------- |
| 1–2   | Root tooling, shared packages (`core`, `ui`)                                | 2026-10-06 |
| 3     | Database packages (`accounts-db`, `web-db`)                                 | 2026-10-06 |
| 4     | `apps/accounts` (identity provider)                                         | 2026-10-06 |
| 5     | `apps/worker` (email queue)                                                 | 2026-10-06 |
| 6     | `web` → `apps/hr` on `company_db`, employees with TanStack Table/Form/Query | 2026-10-06 |
| 6b    | `finance`, `recruitment`, `attendance`, `exam` scaffolded from `hr`         | 2026-10-06 |
| 7     | `apps/finance` payroll reading HR's published view                          | 2026-10-06 |

---

## Phase 1: Root tooling

| File                                                      | Content                                                                              | State |
| :-------------------------------------------------------- | :----------------------------------------------------------------------------------- | :---- |
| `package.json`                                            | pnpm root, Turborepo scripts (`dev`, `build`, `type-check`, `db:*` incl. `db:setup`) | Done  |
| `pnpm-workspace.yaml`                                     | `apps/*`, `packages/*`                                                               | Done  |
| `turbo.json`                                              | Task graph; `db:generate` runs before `dev`, `build`, `type-check`                   | Done  |
| `docker-compose.yml`                                      | Postgres 16 (:5000), RabbitMQ (:5001/:5002), Mailpit (:5003/:5004)                   | Done  |
| `docker/postgres/init.sql`                                | Creates `accounts_db`, `web_db`                                                      | Done  |
| `.env.example`                                            | All variables, documented                                                            | Done  |
| `.gitignore`, `.prettierrc`, `.prettierignore`, `LICENSE` | Copied/adapted from the monolith template                                            | Done  |
| `tsconfig.base.json`                                      | Shared strict compiler options                                                       | Done  |

**Check:** `docker compose up -d` starts all three containers, both databases exist, and
`pnpm install` succeeds. ✅

---

## Phase 2: Shared packages

### `packages/core` (`@workspace/core`)

| File                    | Content                                                                                                        |
| :---------------------- | :------------------------------------------------------------------------------------------------------------- |
| `src/env.ts`            | `parseEnv(schema, input, scope)` from the monolith, `MIN_PASSWORD_LENGTH`                                      |
| `src/urls.ts`           | `accountsUrl`, `webUrl` read from `NEXT_PUBLIC_*` literals                                                     |
| `src/redirect.ts`       | `safeRedirectPath()`: same-origin paths only                                                                   |
| `src/queue/types.ts`    | `QUEUE_NAMES`, `EmailJob` union (`verify-email`, `reset-password`)                                             |
| `src/queue/topology.ts` | `assertEmailQueues()`: quorum `email` queue with delivery limit + `email.dlq`, shared by producer and consumer |
| `src/queue/producer.ts` | Lazy amqplib connection, confirm channel, persistent messages, `publishEmail()`                                |

### `packages/ui` (`@workspace/ui`)

| File                 | Content                                                                                                                                  |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `src/button.tsx`     | Ported `Button` (variants, loading state)                                                                                                |
| `src/card.tsx`       | Ported `Card` family                                                                                                                     |
| `src/input.tsx`      | Ported `Input`                                                                                                                           |
| `src/cn.ts`          | `clsx` + `tailwind-merge`                                                                                                                |
| `tailwind-preset.ts` | Shared theme tokens from the monolith's `tailwind.config.ts`, plus `glass`, `glass-card`, `text-gradient` (so `Card` works in every app) |

Packages export TypeScript source directly. Next apps compile them through `transpilePackages`,
and the worker runs them through `tsx`. Neither package needs a build step.

**Check:** `pnpm --filter "./packages/*" type-check` passes. ✅ Also smoke-tested: `safeRedirectPath`
rejects `//`, `/\`, absolute and `javascript:` inputs; `publishEmail()` creates both quorum queues
and gets a broker confirm.

---

## Phase 3: Databases

### `packages/accounts-db` (`@workspace/accounts-db`)

| File                   | Content                                                                                                                  |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma` | Better Auth core + `jwt` + `oauthProvider` models, generator `prisma-client` → `prisma/generated`                        |
| `prisma.config.ts`     | Loads root `.env`, points at `ACCOUNTS_DATABASE_URL`                                                                     |
| `prisma/migrations/`   | Initial migration                                                                                                        |
| `prisma/seed.ts`       | Admin user (verified, scrypt hash) + `web` OAuth client (SHA-256 hashed secret, `skipConsent`, PKCE, exact redirect URI) |
| `src/client.ts`        | `PrismaPg` adapter, global singleton under a DB-specific key                                                             |
| `src/index.ts`         | `accountsDb` export + types                                                                                              |

The OAuth tables are generated from the plugin with the Better Auth CLI (`auth generate`, package
`auth`; the old `@better-auth/cli` stopped at 1.4) via `pnpm auth:schema`, not hand-copied
from philgeps, because 1.7.7 adds models (`oauthClientAssertion`, `oauthResource`) that 1.6 lacked.

### `packages/web-db` (`@workspace/web-db`, became `packages/hr-db` in phase 6)

Same layout with only the Better Auth core models (`user`, `session`, `account`, `verification`)
and `WEB_DATABASE_URL`. No seed: `web` users are created by the first sign-in.

**Check:** `pnpm db:setup` generates both clients, applies migrations, and seeds `accounts_db`. ✅
Verified from empty databases: `accounts_db` 12 tables, `web_db` 4; seed is idempotent; the stored
client secret equals the plugin's SHA-256/base64url hash. Whether Better Auth actually _uses_ these
tables correctly is proven in phase 4 (discovery, authorize) and phase 6 (token exchange).

Notes from this phase:

- The script is `db:setup`, not `setup`: `pnpm setup` is a built-in pnpm command and never runs
  the script.
- Pin `prisma@^7`: npm's `latest` tag points at the 8.0 release candidate.
- The seed registers `web` with `tokenEndpointAuthMethod: "client_secret_basic"`. The provider
  rejects any other method than the registered one, so `web`'s `genericOAuth` must set
  `authentication: "basic"` (phase 6).

---

## Phase 4: `apps/accounts`

| Area          | Files                                                                                                                                                                                                               |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Config        | `next.config.ts` (loads root `.env`, `transpilePackages`, `serverExternalPackages: ["amqplib"]`), `tailwind.config.ts`, `postcss.config.js`, `eslint.config.mjs`, `tsconfig.json`                                   |
| Auth server   | `src/lib/auth.ts`: monolith config + `jwt()`, `oauthProvider({ loginPage: "/login", consentPage: "/consent" })`, `trustedOrigins`, `cookiePrefix: "accounts"`, `nextCookies()`; email senders call `publishEmail()` |
| Auth client   | `src/lib/auth-client.ts`: `createAuthClient` + `oauthProviderClient()`                                                                                                                                              |
| Server env    | `src/lib/config.server.ts`: `ACCOUNTS_DATABASE_URL`, `ACCOUNTS_AUTH_SECRET`, `RABBITMQ_URL`                                                                                                                         |
| Guards        | `src/lib/session.ts`: `requireAuth()`, `getCurrentSession()`                                                                                                                                                        |
| Route handler | `src/app/api/auth/[...all]/route.ts`, `src/app/api/health/route.ts`                                                                                                                                                 |
| Pages         | `/` (landing), `/login` (ported `LoginForm`), `/forgot-password`, `/reset-password`, `/email-verified`, `/account` (protected profile), `/consent` (minimal accept/deny)                                            |
| Shared UI     | Ported `QueryProvider`, `useAuthSession`, `error.tsx`, `not-found.tsx`, `globals.css`                                                                                                                               |

`/consent` is built even though `web` skips consent, because `consentPage` is required and a
third-party client would otherwise hit a 404 (philgeps left this unbuilt).

**Check:** on :5011, sign-up → verification email → verified → sign-in → `/account` works;
forgot/reset works; `/.well-known/openid-configuration` returns the discovery document.

Verified 2026-10-06 (dev server + curl):

- ✅ `/api/health` ok; discovery complete (S256 PKCE, `client_secret_basic`); `/api/auth/jwks` serves
  an Ed25519 key; protected pages redirect to `/login?redirectTo=…`.
- ✅ Authorize as `web` → `/login` with signed query → sign-in resumes → `web` callback with `code`
  and `state` → token exchange → `userinfo` returns the admin user. This also proves the phase 3
  schema and the seeded hashed client secret.
- ✅ Tampered query → `invalid_signature`; wrong client secret → `invalid_client`; replayed code →
  `invalid_grant`.
- ✅ Sign-up and reset **emails** arrive in Mailpit and the verify link marks the user verified
  (checked with the worker in phase 5).

Notes:

- Env loading: `dotenv -e ../../.env --` in the package scripts, not `@next/env` in
  `next.config.ts` (Next resets `process.env` to its startup snapshot and drops those values).
- A failed client authentication at the token endpoint consumes the code; `web` must start a new
  sign-in after any token error.

---

## Phase 5: `apps/worker`

| File                     | Content                                                            |
| :----------------------- | :----------------------------------------------------------------- |
| `src/config.ts`          | Zod-validated `RABBITMQ_URL`, `SMTP_*`, `WORKER_PORT`              |
| `src/index.ts`           | Starts HTTP server + consumer, graceful shutdown on SIGINT/SIGTERM |
| `src/server.ts`          | Express: `GET /health` (reports broker connection)                 |
| `src/consumer.ts`        | Connect with retry, `prefetch(5)`, ack on success, nack on failure |
| `src/email/templates.ts` | `verify-email`, `reset-password`: subject, text, escaped HTML      |
| `src/email/mailer.ts`    | nodemailer transport                                               |

Failed jobs are retried a limited number of times, then dead-lettered to `email.dlq` instead of
requeued forever (philgeps requeues indefinitely).

**Check:** with `accounts` and `worker` running, sign-up and reset emails appear in Mailpit
(http://localhost:5004).

Verified 2026-10-06:

- ✅ `GET :5012/health` → `200 {"broker":"connected"}` (`503` while the broker is down).
- ✅ Sign-up → `verify-email` and reset → `reset-password` delivered to Mailpit; following the
  verify link sets `emailVerified`. A name of `<b>Tess</b> & Co` arrives escaped in the HTML.
- ✅ Malformed job (unknown template) → straight to `email.dlq`, no retries.
- ✅ Mailpit stopped mid-send → attempts 1–3 fail (`x-delivery-count` counts them), Mailpit back →
  attempt 4 delivers.

Notes:

- Jobs are validated with Zod in the worker; a job that can never succeed is dead-lettered at once
  rather than using up its deliveries.
- A requeued message is redelivered immediately, so the worker waits 2s, 4s, 8s, 16s before each
  requeue. Without that, a few seconds of SMTP downtime would use all 5 attempts.
- nodemailer 10 ships its own types (no `@types/nodemailer`).

---

## Phase 6: `apps/hr` on `company_db` (reference domain app)

> `company_db` is superseded by one database per domain (D17); the HR app itself stays.

Replaces the generic `web` client planned earlier
([D15](decisions.md#d15-real-domain-apps-on-company_db-not-a-generic-example-app)). The sign-in code
built for `web` carried over unchanged apart from names.

| Area         | Files                                                                                                                                                                                                                           |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Database     | `docker/postgres/init.sql`: `company_db`, role `hr_app`, schemas `hr` + `hr_public`, `hr_shadow`                                                                                                                                |
| Data package | `packages/hr-db`: `schemas = ["hr"]`, Better Auth tables + `Department`, `Employee`; migration `*_public_views` creates `hr_public.employee_directory_v1` (no salary); `prisma/seed.ts`                                         |
| Auth         | `src/lib/auth.ts`: `genericOAuth` provider `accounts` (`tokenEndpointAuth: client_secret_basic`, PKCE, `requireIdTokenVerification`, `overrideUserInfo`, `postLogoutRedirectURI`), `cookiePrefix: "hr"`, 10-minute state cookie |
| Sign-in      | `src/lib/auth-client.ts`: `signInWithAccounts()` = `signIn.social({ provider: "accounts" })` with an in-flight guard; `/sso/start` with an accounts health pre-flight                                                           |
| Guards       | `requireAuth(path)` in each page (cached per request); `requireApiSession()` for route handlers (401)                                                                                                                           |
| Domain API   | `GET/POST /api/employees`, `GET /api/departments`; Zod schema shared with the form; 409 on duplicate number or email                                                                                                            |
| UI           | `/dashboard` (headcount, identity link), `/employees` (TanStack Table v9 with sorting + search, TanStack Form create form, TanStack Query)                                                                                      |
| accounts     | Seed registers clients from a list (`hr` first); `postLogoutRedirectUris` with a trailing slash                                                                                                                                 |

Verified 2026-10-06 (curl, one cookie jar):

- ✅ `/dashboard` without a session → 307 `/sso/start?redirectTo=%2Fdashboard`.
- ✅ Sign-in → accounts `/login` (signed query) → callback → `/dashboard` 200. The shadow user and the
  `accounts:<sub>` link are in `hr.user` / `hr.account`, so Better Auth tables inside a domain
  schema work (the shared-database spike had not tested this).
- ✅ `/api/employees` without a session → 401; create → 201 (email normalized); duplicate → 409;
  invalid body → 400 with field errors. The new row appears in `hr_public.employee_directory_v1`
  without salary.
- ✅ Sign out of HR only → the next sign-in skips `/login`. Sign out everywhere → accounts
  end-session → 302 back to `http://localhost:5010/`, accounts session gone.
- ✅ Migrations run as `hr_app`; `migrate status` clean.

Notes and gotchas:

- Better Auth 1.7: genericOAuth has no client plugin; sign in with `signIn.social`. `signOut()` also
  signs out of accounts unless called with `disableRedirect: true`.
- Better Auth builds `post_logout_redirect_uri` with `new URL()`, so it always ends in `/`. The
  registered URI must match exactly.
- Prisma 7 `migrate dev` does not run `generate`; run `pnpm db:generate` after schema changes.
- Match Prisma errors by `error.code`, not `instanceof`: Next bundles the workspace package, so the
  error can come from another copy of the class.
- A guarded page under a `loading.tsx` boundary redirects inside the HTML stream (status 200), not
  with a 307. Guarded pages have no `loading.tsx`.

Open (designed later, not blocking): authorization beyond "signed in" (needs a role claim from
`accounts` or an HR permission table); HR domain events (designed with finance as the consumer).

---

## Phase 6b: scaffolded `recruitment`, `attendance`, `exam` (2026-10-06)

Generated from `hr` by a script (the recipe is in [adding-a-service.md](adding-a-service.md)):
copy `apps/hr` without `src/features` and employee routes, copy `packages/hr-db` with only the
Better Auth models, then register the app in `init.sql`, `.env`/`.env.example`, `core/urls.ts`,
accounts `trustedOrigins` and seed `CLIENTS`, and `turbo.json`. `finance` was scaffolded the same
way before phase 7.

Verified: each app's landing page, `/sso/start`, SSO round-trip to `/dashboard`, route guard (307)
and sign-out everywhere; all apps together under one `pnpm dev` (2026-10-06, no errors or warnings
in the log); `pnpm type-check` 21/21, `pnpm lint` 7/7, `pnpm build` 12/12.

`pnpm build` logs `Discovery fetch failed for "accounts"` when accounts isn't running: harmless,
the apps read the discovery document at startup and the build still succeeds.

---

## Phase 7: `apps/finance` (cross-domain read)

| Area         | Files                                                                                                                                                                                                                                |
| :----------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grant        | `packages/hr-db/prisma/migrations/*_grant_public_views_to_finance`: HR's own migration grants `finance_app` `USAGE` on `hr_public` and `SELECT` on its views (current and future). The owner decides who reads.                      |
| Data package | `packages/finance-db`: `schemas = ["finance", "hr_public"]`, `previewFeatures = ["views"]`, `view EmployeeDirectory` → `hr_public.employee_directory_v1`; `PayrollEntry` (employee id from HR, no FK, unique per employee and month) |
| Domain API   | `GET /api/employees` (read-only, from the view, terminated excluded), `GET/POST /api/payroll`                                                                                                                                        |
| UI           | `/payroll`: TanStack Table (amount columns sorted as numbers), TanStack Form with the employee picker fed by HR's view                                                                                                               |

Verified 2026-10-06:

- ✅ Finance lists HR's employees through the view; `finance_app` cannot write through it
  (`cannot update view`) and still cannot read `hr.*`.
- ✅ Payroll create → 201; same employee and month → 409; deductions > gross → 400; an id HR never
  issued → 400; an employee HR marked terminated → 400.
- ✅ HR renames an employee → Finance shows the new name on the next read (no copy to sync).
- ✅ The finance migration created only `finance.*`; nothing in `hr_public`.

Superseded later the same day: D17 replaces the `hr_public` view with an HR API call
([roadmap](roadmap.md) step 1). Events were decided as D16.

---

## Step 1: one database per domain + Finance → HR API (2026-10-07)

| Area                   | Change                                                                                                                                                                                                                                             |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Databases              | `init.sql`: `accounts_db` + per domain `<app>_db` and `<app>_shadow` owned by `<app>_app`; `REVOKE CONNECT … FROM PUBLIC` on all of them (including `accounts_db`). `company_db` and the old `web_db` dropped.                                     |
| Domain packages        | No `schemas` / `@@schema`; finance lost the view model and `views` preview feature; fresh `init` migration per package (`public` schema of its own database).                                                                                      |
| `@workspace/core/apis` | `API_RESOURCES` (HR API: `${hrUrl}/api/v1`, scope `hr:employees.read`), `API_SCOPES`, `API_GRANTS` (finance → HR), contract `HrEmployeeV1`.                                                                                                        |
| accounts               | `oauthProvider({ scopes: [...OIDC, ...API_SCOPES], resources, resourceSeedMode: "overwrite" })`. Seed: upserts `oauthResource` rows, gives granted clients `client_credentials` + `clientCredentialsScopes`, rewrites `oauthClientResource` links. |
| hr                     | `GET /api/v1/employees`, `GET /api/v1/employees/[id]` (bearer only, `requireAppToken`), read model without salary. Depends on `@better-auth/oauth-provider` (`/resource-client`).                                                                  |
| finance                | `lib/hr-client.ts` (client-credentials token, cached until 60 s before expiry, shared in-flight request, one retry on 401); payroll uses it; HR down → 503.                                                                                        |

Verified (curl, one `pnpm dev`):

- ✅ `finance_app` cannot connect to `hr_db`, `exam_db` or `accounts_db` (`permission denied for database`).
- ✅ Token: `client_credentials` for finance → EdDSA JWT (`typ: at+jwt`), `aud` = HR API, `scope`
  `hr:employees.read`, 1 h. Unknown scope → `invalid_scope`; the HR client (no grant) →
  `unauthorized_client`; without `resource` accounts issues an opaque token.
- ✅ HR `/api/v1/employees`: no token / garbage / opaque token → 401 with `WWW-Authenticate`;
  valid → 200; unknown id → 404; no salary in the response.
- ✅ Finance e2e unchanged in behavior: employee list from HR, payroll 201 / 409 / 400, unknown and
  terminated employee rejected, HR rename visible on the next read, 401 without session.
- ✅ HR process stopped → finance `/api/employees` 503 "HR is unavailable", payroll page still loads,
  other apps unaffected.
- ✅ All five domain apps: SSO round-trip, 307 guard, sign-out everywhere; each shadow user lands in
  its own `<app>_db`. No errors or warnings in the `pnpm dev` log. `type-check` 21/21, `lint` 7/7,
  `build` 12/12.

Gotchas:

- The existing `<app>_shadow` databases still held the old schema-based tables; they were dropped
  and recreated empty before the new baseline migrations.
- A database owned by `postgres` (accounts_db) is still connectable by every role until
  `REVOKE CONNECT … FROM PUBLIC`; tables were not readable (no grants), but now the door is shut too.
- `verifyBearerToken` throws better-call `APIError`s with `statusCode` (401/403) and a
  `WWW-Authenticate` header; pass both through rather than mapping to a generic 401.
- Deliberately not changed: accounts still connects as `postgres` in development (a dedicated
  `accounts_app` role is part of the production checklist).

---

## Step 2: global sign-out (2026-10-07)

| Area                   | Change                                                                                                                                                                                                                                       |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider               | Nothing to build: `@better-auth/oauth-provider` 1.7.7 already plans and sends back-channel logout tokens when an accounts session is deleted (`session.delete` hook), to clients with tokens from that session and a `backchannelLogoutUri`. |
| `@workspace/core/oidc` | `verifyLogoutToken()` (jose, accounts JWKS, `iss`, `aud`, `typ: logout+jwt`, events claim, no `nonce`, `sub`) and `handleBackchannelLogout()` (form body, 400 on bad tokens, `Cache-Control: no-store`). `jose` added to core.               |
| Every app              | `POST /api/backchannel-logout`: maps `sub` to the local user via `account.accountId` and deletes all their sessions. `UserMenu`: one **Sign out** (`authClient.signOut()`), the "this app only" option removed.                              |
| accounts seed          | `backchannelLogoutUri: ${appUrl}/api/backchannel-logout`, `backchannelLogoutSessionRequired: false` per client.                                                                                                                              |

Verified (curl, one cookie jar, one `pnpm dev`):

- ✅ Signed in to hr (password), finance and exam (one click each); sign out in finance → hr, finance
  and exam dashboards all 307, every app's `session` table empty, accounts session gone; the logs
  show each app receiving and accepting a logout token.
- ✅ Signing out on accounts itself also ends the hr session.
- ✅ `/api/backchannel-logout` without a token, with garbage, or with an unsigned forged token → 400.
- ✅ All five apps: SSO round-trip, guard, sign-out → landing page; landing pages 200; `type-check`
  21/21, `lint` 7/7, `build` 12/12.

Gotchas:

- Better Auth's client side (genericOAuth) has no back-channel receiver; it is ours, in core.
- Dynamic client registration rejects non-https or private `backchannel_logout_uri`s; the seed writes
  the client row directly, and delivery does not re-check the host, so localhost works in dev.
- accounts' `/sign-in/email` limit (5 per 60 s) is easy to hit in test scripts; failures look like
  a missing callback URL.
- Ending _all_ of a user's sessions in an app (not only the one tied to the ended accounts `sid`)
  also signs out that user's other browsers in that app. Acceptable for now; tracking `sid` per
  local session would make it exact.

---

## Step 3: exam on TanStack Start (2026-10-07)

| Area                  | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/exam`           | Rewritten on TanStack Start 1.168 (Vite 8, Nitro 3 beta, React 19), port 5016, same `exam_db`, OAuth client and cookie prefix. Routes: `index` (landing), `sso/start` (health pre-flight + browser handshake), `_app` (pathless layout, `beforeLoad` guard → `/sso/start?redirectTo=`), `_app/dashboard`, server routes `api/auth/$`, `api/health`, `api/backchannel-logout`. Session via `createServerFn` (`server/session.ts`) over `server/session.server.ts`. Tailwind 3 + `@workspace/ui` through PostCSS. ESLint flat config (typescript-eslint). |
| Auth                  | Same genericOAuth config as the Next apps with `tanstackStartCookies()`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| All apps              | `getAuth()` from `@workspace/core/auth-instance` (`selfHealingAuth`) replaces the module-level `auth`: an instance created while accounts is unreachable is rebuilt on a later request.                                                                                                                                                                                                                                                                                                                                                                 |
| `@workspace/core/env` | `parseEnv` typed structurally (works with Zod 3 and 4 schemas).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Repo                  | `turbo.json` build outputs include `.output/**`; `.output/` and `.tanstack/` ignored; `routeTree.gen.ts` committed and excluded from Prettier/ESLint.                                                                                                                                                                                                                                                                                                                                                                                                   |

Verified:

- ✅ Dev and production (`node .output/server/index.mjs`): health 200, landing 200 with styles
  (Tailwind preset classes present), unknown path 404, `/dashboard` signed out → 307 to
  `/sso/start?redirectTo=%2Fdashboard`, SSO round-trip → `/dashboard` 200, sign-out → landing.
- ✅ Under one `pnpm dev` with all apps: global sign-out from finance ends the exam session too
  (exam log: back-channel token accepted). No errors or warnings in the dev log.
- ✅ Race fixed: exam started with accounts down → `Provider not found`; accounts started later →
  next sign-in works without restarting exam.
- ✅ `type-check` 21/21, `lint` 7/7, `build` 12/12 (exam included).

Gotchas:

- **Discovery race (all apps, not Start-specific):** better-auth's genericOAuth fetches discovery
  once at init; on failure the provider is skipped for the process's lifetime. Explicit endpoint
  URLs would avoid discovery but lose ID-token verification, so the instance is rebuilt instead.
- **Import protection:** a route file importing a module that imports
  `@tanstack/react-start/server` fails the client build, even if only a server function uses it.
  Server-only helpers go in `*.server.ts`.
- **Zod:** the Nitro build deduplicated `zod` to the app's 3.25 copy, so better-auth's
  `sessionSchema.loose()` (Zod 4) crashed at runtime (500 on every request). Start apps use Zod 4.
- `postcss.config` must be ESM (`export default`) in a `"type": "module"` package (ESLint
  rejected `module.exports`).
- Vite dev serves `/src/styles.css` as JS unless the request looks like a stylesheet request; browsers
  send `Accept: text/css`, so it is fine (curl without it shows `text/javascript`).
- Nitro's Node server has no client-IP header locally; Better Auth warns that rate limiting falls back
  to one shared bucket. Production: forward the IP and configure `advanced.ipAddress`.

---

## Step 4: crm, operations, analytics, collaboration, workspace (2026-10-07)

Generated by a script from the two sign-in-only references: `apps/recruitment` +
`packages/recruitment-db` for the Next.js apps, `apps/exam` + `packages/exam-db` for the TanStack
Start apps. Git-tracked files only; names, ports, icons and landing text replaced (`exam` only where
not followed by `ple`, to keep `admin@example.com`); fresh `init` migration per database.
Registered in `init.sql` (role, `<app>_db`, `<app>_shadow`, `REVOKE CONNECT`), `.env` /
`.env.example`, `core/urls.ts`, accounts `trustedOrigins`, the accounts seed (`CLIENTS` with
back-channel URIs) and `turbo.json`.

| App           | Framework      | Port | Database           |
| :------------ | :------------- | :--- | :----------------- |
| crm           | Next.js        | 5017 | `crm_db`           |
| operations    | Next.js        | 5018 | `operations_db`    |
| analytics     | Next.js        | 5019 | `analytics_db`     |
| collaboration | TanStack Start | 5020 | `collaboration_db` |
| workspace     | TanStack Start | 5021 | `workspace_db`     |

Verified (one `pnpm dev`, all 12 services, one cookie jar):

- ✅ Health and landing 200 for accounts, worker and all ten domain apps.
- ✅ Every domain app: `/dashboard` signed out → 307; sign-in (one password entry for the first app,
  one click for the other nine) → `/dashboard` 200.
- ✅ Sign out in crm → all ten apps 307, accounts session gone.
- ✅ No errors or warnings in the dev log; `type-check` 36/36, `lint` 12/12, `build` 22/22.

Gotcha: Turbo's default concurrency (10) is below 12 persistent dev tasks; `pnpm dev` refused to
start until `"concurrency": "20"` was set in `turbo.json`.

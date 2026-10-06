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

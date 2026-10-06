# Implementation Plan

Build order for the template, phase by phase. Each phase ends with a check that must pass before
the next one starts.

> **Status:** phases 1–5 done (2026-10-06). Phases 6–8 not started.

---

## Phase 1: Root tooling

| File                       | Content                                                                  | State   |
| :------------------------- | :----------------------------------------------------------------------- | :------ |
| `package.json`             | pnpm root, Turborepo scripts (`dev`, `build`, `type-check`, `db:*` incl. `db:setup`) | Done    |
| `pnpm-workspace.yaml`      | `apps/*`, `packages/*`                                                   | Done    |
| `turbo.json`               | Task graph; `db:generate` runs before `dev`, `build`, `type-check`       | Done    |
| `docker-compose.yml`       | Postgres 16 (:5000), RabbitMQ (:5001/:5002), Mailpit (:5003/:5004)      | Done    |
| `docker/postgres/init.sql` | Creates `accounts_db`, `web_db`                                          | Done    |
| `.env.example`             | All variables, documented                                                | Done    |
| `.gitignore`, `.prettierrc`, `.prettierignore`, `LICENSE` | Copied/adapted from the monolith template | Done    |
| `tsconfig.base.json`       | Shared strict compiler options                                           | Done    |

**Check:** `docker compose up -d` starts all three containers, both databases exist, and
`pnpm install` succeeds. ✅

---

## Phase 2: Shared packages

### `packages/core` (`@workspace/core`)

| File                     | Content                                                                       |
| :----------------------- | :---------------------------------------------------------------------------- |
| `src/env.ts`             | `parseEnv(schema, input, scope)` from the monolith, `MIN_PASSWORD_LENGTH`     |
| `src/urls.ts`            | `accountsUrl`, `webUrl` read from `NEXT_PUBLIC_*` literals                    |
| `src/redirect.ts`        | `safeRedirectPath()`: same-origin paths only                                  |
| `src/queue/types.ts`     | `QUEUE_NAMES`, `EmailJob` union (`verify-email`, `reset-password`)            |
| `src/queue/topology.ts`  | `assertEmailQueues()`: quorum `email` queue with delivery limit + `email.dlq`, shared by producer and consumer |
| `src/queue/producer.ts`  | Lazy amqplib connection, confirm channel, persistent messages, `publishEmail()` |

### `packages/ui` (`@workspace/ui`)

| File               | Content                                   |
| :----------------- | :---------------------------------------- |
| `src/button.tsx`   | Ported `Button` (variants, loading state) |
| `src/card.tsx`     | Ported `Card` family                      |
| `src/input.tsx`    | Ported `Input`                            |
| `src/cn.ts`        | `clsx` + `tailwind-merge`                 |
| `tailwind-preset.ts` | Shared theme tokens from the monolith's `tailwind.config.ts`, plus `glass`, `glass-card`, `text-gradient` (so `Card` works in every app) |

Packages export TypeScript source directly. Next apps compile them through `transpilePackages`,
and the worker runs them through `tsx`. Neither package needs a build step.

**Check:** `pnpm --filter "./packages/*" type-check` passes. ✅ Also smoke-tested: `safeRedirectPath`
rejects `//`, `/\`, absolute and `javascript:` inputs; `publishEmail()` creates both quorum queues
and gets a broker confirm.

---

## Phase 3: Databases

### `packages/accounts-db` (`@workspace/accounts-db`)

| File                    | Content                                                                         |
| :---------------------- | :------------------------------------------------------------------------------ |
| `prisma/schema.prisma`  | Better Auth core + `jwt` + `oauthProvider` models, generator `prisma-client` → `prisma/generated` |
| `prisma.config.ts`      | Loads root `.env`, points at `ACCOUNTS_DATABASE_URL`                            |
| `prisma/migrations/`    | Initial migration                                                               |
| `prisma/seed.ts`        | Admin user (verified, scrypt hash) + `web` OAuth client (SHA-256 hashed secret, `skipConsent`, PKCE, exact redirect URI) |
| `src/client.ts`         | `PrismaPg` adapter, global singleton under a DB-specific key                    |
| `src/index.ts`          | `accountsDb` export + types                                                     |

The OAuth tables are generated from the plugin with the Better Auth CLI (`auth generate`, package
`auth`; the old `@better-auth/cli` stopped at 1.4) via `pnpm auth:schema`, not hand-copied
from philgeps, because 1.7.7 adds models (`oauthClientAssertion`, `oauthResource`) that 1.6 lacked.

### `packages/web-db` (`@workspace/web-db`)

Same layout with only the Better Auth core models (`user`, `session`, `account`, `verification`)
and `WEB_DATABASE_URL`. No seed: `web` users are created by the first sign-in.

**Check:** `pnpm db:setup` generates both clients, applies migrations, and seeds `accounts_db`. ✅
Verified from empty databases: `accounts_db` 12 tables, `web_db` 4; seed is idempotent; the stored
client secret equals the plugin's SHA-256/base64url hash. Whether Better Auth actually *uses* these
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

| Area        | Files                                                                                       |
| :---------- | :------------------------------------------------------------------------------------------ |
| Config      | `next.config.ts` (loads root `.env`, `transpilePackages`, `serverExternalPackages: ["amqplib"]`), `tailwind.config.ts`, `postcss.config.js`, `eslint.config.mjs`, `tsconfig.json` |
| Auth server | `src/lib/auth.ts`: monolith config + `jwt()`, `oauthProvider({ loginPage: "/login", consentPage: "/consent" })`, `trustedOrigins`, `cookiePrefix: "accounts"`, `nextCookies()`; email senders call `publishEmail()` |
| Auth client | `src/lib/auth-client.ts`: `createAuthClient` + `oauthProviderClient()`                     |
| Server env  | `src/lib/config.server.ts`: `ACCOUNTS_DATABASE_URL`, `ACCOUNTS_AUTH_SECRET`, `RABBITMQ_URL` |
| Guards      | `src/lib/session.ts`: `requireAuth()`, `getCurrentSession()`                                |
| Route handler | `src/app/api/auth/[...all]/route.ts`, `src/app/api/health/route.ts`                       |
| Pages       | `/` (landing), `/login` (ported `LoginForm`), `/forgot-password`, `/reset-password`, `/email-verified`, `/account` (protected profile), `/consent` (minimal accept/deny) |
| Shared UI   | Ported `QueryProvider`, `useAuthSession`, `error.tsx`, `not-found.tsx`, `globals.css`       |

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

| File                    | Content                                                               |
| :---------------------- | :-------------------------------------------------------------------- |
| `src/config.ts`         | Zod-validated `RABBITMQ_URL`, `SMTP_*`, `WORKER_PORT`                 |
| `src/index.ts`          | Starts HTTP server + consumer, graceful shutdown on SIGINT/SIGTERM    |
| `src/server.ts`         | Express: `GET /health` (reports broker connection)                    |
| `src/consumer.ts`       | Connect with retry, `prefetch(5)`, ack on success, nack on failure    |
| `src/email/templates.ts` | `verify-email`, `reset-password`: subject, text, escaped HTML       |
| `src/email/mailer.ts`   | nodemailer transport                                                  |

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

## Phase 6: `apps/web`

| Area        | Files                                                                                     |
| :---------- | :---------------------------------------------------------------------------------------- |
| Auth server | `src/lib/auth.ts`: `genericOAuth({ providerId: "accounts", discoveryUrl, pkce: true, overrideUserInfo: true })`, `cookiePrefix: "web"`, 10-minute state cookie, `nextCookies()` |
| Auth client | `src/lib/auth-client.ts`: `createAuthClient` + `genericOAuthClient()`, `signInWithAccounts()` with an in-flight guard |
| Server env  | `src/lib/config.server.ts`: `WEB_DATABASE_URL`, `WEB_AUTH_SECRET`, `WEB_OAUTH_CLIENT_*`  |
| Guards      | `src/lib/session.ts`: `requireAuth()` redirects to `/sso/start?redirectTo=…`              |
| Pages       | `/` (landing + sign-in), `/sso/start` (auto handshake, health pre-flight), `/dashboard` (protected), sign-out menu |
| Route handler | `src/app/api/auth/[...all]/route.ts`                                                    |

**Check:** on :5010, "Sign in" goes to accounts, comes back signed in, `/dashboard` shows the user;
a second sign-in is one click; sign-out works; `web_db.user` holds the shadow row.

---

## Phase 7: Verification

| Command / test                       | Expectation                                       |
| :----------------------------------- | :------------------------------------------------ |
| `pnpm type-check`                    | Passes for all apps and packages                  |
| `pnpm lint`                          | No errors                                         |
| `pnpm build`                         | Both Next apps build; worker type-checks          |
| Manual: full SSO round-trip          | Section 3 of [auth-flows.md](auth-flows.md) works step by step |
| Manual: broker down                  | Sign-up still succeeds; error logged in accounts  |
| Manual: tampered `/login` query      | Sign-in rejected with `invalid_signature`         |
| Manual: wrong client secret          | Token exchange fails; `web` shows a login error   |

---

## Phase 8: Documentation

- `README.md`: quick start, scripts, ports.
- Finalize `ARCHITECTURE.md` and everything in `docs/` against the built code.
- Remove the "planned" status banners.

---

## Later phases

Not part of v1; listed so the [company stack](company-stack.md) items marked "not included yet"
have a home.

| Phase | Content |
| :---- | :------ |
| 9 | Second client app (e.g. `admin`) to prove [adding-a-service.md](adding-a-service.md) works unchanged |
| 10 | TanStack Table + Form example in a client app |
| 11 | TanStack Start example client signing in through `accounts` |
| 12 | Real-time service (Socket.IO), after the design questions in [company-stack.md](company-stack.md#real-time-open-design-questions) are settled |

---

## Estimated effort

| Phase | Size   |
| :---- | :----- |
| 1–2   | Small  |
| 3     | Medium (Prisma 7 + plugin schema) |
| 4     | Large (most UI is ported, OAuth wiring is new) |
| 5     | Small  |
| 6     | Medium |
| 7–8   | Medium |

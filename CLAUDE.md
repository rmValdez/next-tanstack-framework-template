# CLAUDE.md

Context for Claude Code sessions in this repo. Read this first, then the docs it points to.

## What this project is

`next-tanstack-framework-template` (renamed from `next-betterAuth-multiservice-template` on
2026-10-06): the company's **multi-service** full-stack starter in one pnpm + Turborepo
monorepo, built around the company's real domain apps (D15):

- `apps/accounts` (Next.js 15, :5011): identity provider. Better Auth + `jwt` + `oauthProvider`.
  Owns users and passwords in `accounts_db` (always a separate database).
- Domain apps (Next.js 15): `apps/hr` (:5010, the reference implementation), `finance` (:5013),
  `recruitment` (:5014), `attendance` (:5015), `exam` (:5016). Each signs in through `accounts`
  with Better Auth `genericOAuth` (OIDC + PKCE) and keeps a shadow user, its own session and its
  domain data in its own schema of `company_db`, written only by its Postgres role
  (`<app>_app`). Other domains read it only through `<app>_public` views.
- `apps/worker` (Express, :5012): consumes email jobs from RabbitMQ, sends via SMTP (Mailpit in dev).
- Planned: `apps/realtime` (Socket.IO, :5017), phase 9.

Shared packages: `packages/accounts-db`, `packages/<app>-db` per domain (Prisma 7 +
`@prisma/adapter-pg`, `?schema=<app>`), `packages/core` (env, URLs, queue types + producer),
`packages/ui` (components, Tailwind preset).

## Where it comes from

- **Created from** `../next-betterAuth-monolith-template` (single Next.js app, same author). Its auth
  forms, Better Auth config, rate limits, Zod env, `requireAuth()`, UI components and seed are
  **copied** into this repo. Never modify the monolith; read it as the source.
- **Architecture follows** `C:\Users\My PC\Documents\Github\personal\government-philgeps-workspace\philgeps-workspace`
  (TanStack Start + Bun). Same IdP/client/worker pattern, rebuilt on Next.js. Read-only reference.

## Status (2026-10-06)

- Done: phases 1–6 (root config, `packages/*`, `apps/accounts`, `apps/worker`, `apps/hr`).
  `apps/web` was replaced by `apps/hr` on `company_db` (D15). All verified with curl
  (OIDC round-trip, emails into Mailpit, HR API, sign-out everywhere).
- Scaffolded (copied from `hr`, sign-in verified, no domain features yet): `finance`,
  `recruitment`, `attendance`, `exam`. The generator logic: copy `apps/hr` minus
  `src/features` + employee routes, copy `packages/hr-db` with only the Better Auth models
  re-tagged `@@schema("<app>")`, then add role/schema to `init.sql`, env vars, `core/urls.ts`,
  accounts `trustedOrigins` and seed `CLIENTS`, `turbo.json`.
- Not started: domain features of phases 7–10, `apps/realtime`, phase 11 (verification and
  docs). README/ARCHITECTURE/auth-flows/configuration still describe `web`; rewrite them for the
  domain apps (phase 11, or sooner).
- Git: remote `origin` = github.com/rmValdez/next-tanstack-framework-template, branch `main`.
  No Claude co-author trailers in commits.
- Ports: infra 5000–5004; apps 5010 hr, 5011 accounts, 5012 worker, 5013 finance,
  5014 recruitment, 5015 attendance, 5016 exam, 5017 realtime.
- Phase 7 (finance payroll reading `hr_public`) done and verified. **Next step:** decide where
  domain-event consumers run (proposal: a `src/worker.ts` per domain app, run with `tsx`, own DB
  role), then phase 8 (`apps/recruitment`, "applicant hired" → HR).

## Documentation map

| File | Contents |
| :--- | :--- |
| [README.md](README.md) | Overview, quick start, doc index |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Services, diagrams, data model, security |
| [docs/implementation-plan.md](docs/implementation-plan.md) | Build phases, files per phase, done-checks |
| [docs/auth-flows.md](docs/auth-flows.md) | SSO handshake, endpoints, sign-up/reset/sign-out, cookies |
| [docs/configuration.md](docs/configuration.md) | Env variables, ports |
| [docs/development.md](docs/development.md) | Scripts, changes, debugging |
| [docs/adding-a-service.md](docs/adding-a-service.md) | Adding client apps / workers |
| [docs/deployment.md](docs/deployment.md) | Production checklist |
| [docs/company-stack.md](docs/company-stack.md) | Framework policy: Next.js default, TanStack libs, Start by exception |
| [docs/decisions.md](docs/decisions.md) | Decision log (D1–D14) |
| [docs/shared-database/](docs/shared-database/README.md) | Variant: shared Postgres, schema per domain (spike-verified) |
| [docs/philgeps-comparison.md](docs/philgeps-comparison.md) | vs philgeps-workspace |
| [docs/monolith-comparison.md](docs/monolith-comparison.md) | vs monolith template, file-by-file copy map |

When code is built, update the docs to match and remove their "planned" status banners.

## Fixed decisions (don't re-litigate)

pnpm · Turborepo · Next.js 15.5 (not 16) as default framework, TanStack libraries allowed, TanStack Start only by documented exception (D14) · Prisma 7.x (not 8 RC) · Better Auth 1.7.x +
`@better-auth/oauth-provider` same version · Zod · Tailwind 3 · ESLint + Prettier · RabbitMQ
(amqplib 2.x, ships its own types) · nodemailer · plain escaped HTML email templates (not React Email) · worker on `tsx` ·
no Redis in v1 · OAuth client secrets hashed (plugin default) · email verification by link (not OTP).

## Facts verified against better-auth@1.7.7

- OIDC endpoints on accounts: `/api/auth/oauth2/{authorize,token,userinfo,end-session,revoke,introspect,consent,continue}`,
  discovery at `/api/auth/.well-known/openid-configuration`, keys at `/api/auth/jwks`.
- A domain app's redirect URI: `${NEXT_PUBLIC_<APP>_URL}/api/auth/callback/accounts` (genericOAuth registers as a social provider; callback path is `/callback/:id`). Sign in with `signIn.social({ provider: "accounts" })`; there is no genericOAuth client plugin in 1.7.
- `oauthProvider` redirects to `loginPage` with a **signed** query (`sig`, `exp`). On `/login`, the
  auth client must include `oauthProviderClient()` (from `@better-auth/oauth-provider/client`); it
  attaches `oauth_query` to the sign-in POST and the server resumes authorization. No manual redirect.
- `consentPage` is a required option. Build a minimal `/consent` page.
- `storeClientSecret` defaults to `"hashed"` when the JWT plugin is on: SHA-256 → base64url (no
  padding). The seed must store the secret hashed the same way.
- 1.7 adds models `oauthClientAssertion`, `oauthResource`, `oauthClientResource`; generate the schema
  with the CLI from package `auth` (`pnpm auth:schema` in each db package), not `@better-auth/cli`
  (stuck at 1.4) and not by copying philgeps' 1.6 schema.
- The token endpoint only accepts the client's registered `tokenEndpointAuthMethod`. The seed
  registers each app as `client_secret_basic`, so its genericOAuth needs `tokenEndpointAuth: { method: "client_secret_basic" }`.
- `signOut()` also ends the accounts session (RP-initiated logout) unless called with
  `disableRedirect: true`. `post_logout_redirect_uri` always has a trailing slash; the seed registers it that way.
- Root script is `pnpm db:setup` (`pnpm setup` is a pnpm built-in). Pin `prisma@^7` (`latest` is 8 RC).
- On localhost all apps share a cookie jar, so set distinct `advanced.cookiePrefix` (`accounts`, `hr`, ...).
- Give each app's OAuth state cookie `maxAge: 600` (philgeps' `state_mismatch` fix).
- Changing `.env` secrets: a new `<APP>_OAUTH_CLIENT_SECRET` needs `pnpm db:seed` (else
  `invalid client_secret`); a new `ACCOUNTS_AUTH_SECRET` makes the stored JWKS key undecryptable
  (dev fix: `DELETE FROM jwks` in accounts_db). Restart the app after any `.env` change.
- Issuer is `${NEXT_PUBLIC_ACCOUNTS_URL}/api/auth`; ID tokens are EdDSA (Ed25519). A failed client
  auth at `/oauth2/token` consumes the authorization code.

## Conventions

- Match the monolith's code style: comments explain *why*, Zod env parsed at import, server-only
  secrets in `config.server.ts`, never imported by client components.
- Each service owns its database; services communicate only over HTTP/OIDC or the queue.
- Naming per app `<app>`: package `@workspace/<app>-db`, Postgres database `<app>_db` (underscore,
  e.g. `hr_db`), env `<APP>_DATABASE_URL`, cookie prefix `<app>`. Table in docs/adding-a-service.md.
- Workspace packages export TypeScript source; Next apps use `transpilePackages`.
- One root `.env`; Next apps load it with `dotenv -e ../../.env --` in their package scripts
  (`@next/env` in `next.config.ts` does not work: Next resets `process.env`).
- Shell is Windows (PowerShell primary, Git Bash available).

## Working with the user

- The user often asks questions to understand ("just asking", "are we just planning?"). Answer the
  question; don't start building unless they say to proceed.
- Keep answers short and concrete; tables and small diagrams work well.

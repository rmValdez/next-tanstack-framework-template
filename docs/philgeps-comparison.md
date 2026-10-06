# Comparison with philgeps-workspace

This template follows the architecture of `government-philgeps-workspace/philgeps-workspace`,
rebuilt on Next.js and reduced to a reusable starter. This page lists what matches, what differs,
and why.

---

## Same architecture

| Area             | Both                                                                                 |
| :--------------- | :----------------------------------------------------------------------------------- |
| Repo             | Turborepo monorepo, `apps/` + `packages/`, one root `.env`                           |
| Identity         | `accounts` is the identity provider: Better Auth `jwt` + `oauthProvider`             |
| Client sign-in   | Client apps use Better Auth `genericOAuth` against `accounts`, with PKCE             |
| Shadow users     | Client apps keep a local user copy, refreshed with `overrideUserInfo: true`          |
| Databases        | One Prisma 7 package per service (`@prisma/adapter-pg`), one database per service    |
| Cookies          | Distinct `cookiePrefix` per app                                                      |
| State cookie     | 10-minute OAuth state cookie (philgeps' fix for `state_mismatch`)                    |
| Worker           | Express + amqplib consumer, nodemailer, Mailpit in dev                               |
| Shared packages  | `packages/core`, `packages/ui`                                                       |
| SSO bridge       | `/sso/start` route with a health-check pre-flight                                    |

---

## Differences

### Framework and tooling

| Area             | philgeps                              | This template                          | Reason                               |
| :--------------- | :------------------------------------ | :------------------------------------- | :----------------------------------- |
| App framework    | TanStack Start (Vite + Nitro)         | Next.js 15 (App Router)                | Purpose of this template             |
| Server code      | `createServerFn`, router loaders      | Server Components, route handlers      | Follows the framework                |
| Cookie plugin    | `tanstackStartCookies()`              | `nextCookies()`                        | Follows the framework                |
| Package manager  | Bun                                   | pnpm                                   | Matches the monolith template        |
| Lint / format    | Biome                                 | ESLint + Prettier                      | Matches the monolith template        |
| Forms            | TanStack Form                         | React state (ported forms)             | Fewer dependencies for a starter     |
| Env loading      | `bun --env-file`                      | `@next/env`, `tsx --env-file`          | Follows the toolchain                |

### Scope

| Area                 | philgeps                                         | This template                    |
| :------------------- | :----------------------------------------------- | :------------------------------- |
| Client apps          | `philgeps`, `marketplace`                        | `web` (see [adding-a-service.md](adding-a-service.md)) |
| Worker jobs          | Email, Excel import/export, generic tasks        | Email                            |
| Redis + RedisInsight | Included                                         | Not included                     |
| `@better-auth/sso`   | Included                                         | Not included                     |
| Email templates      | React Email, 7 templates                         | Plain HTML, 2 templates          |
| Domain features      | Registration, organizations, roles, payments, files | None                          |
| Extra user fields    | `gender`, `status`, `contactNumber`              | Better Auth defaults only        |
| Activation flow      | `PENDING_PASSWORD` + set-password email          | Not included                     |
| Per-app Dockerfiles  | Yes                                              | Not yet                          |
| Schema files         | Split (`prisma/schema/*.prisma`)                 | One `schema.prisma` per package  |
| Seeding              | Central (`packages/core/seed`)                   | Per database package             |

### Security and behavior

| Area                    | philgeps                                         | This template                                   |
| :---------------------- | :----------------------------------------------- | :---------------------------------------------- |
| OAuth client secrets    | Plain text (`storeClientSecret` custom identity)  | SHA-256 hashed (plugin default)                 |
| Login → authorize resume | Manual redirect with the raw query string        | Signed `oauth_query` via `oauthProviderClient()` |
| Consent page            | Configured, route not built                      | Minimal `/consent` built                        |
| Email verification      | OTP code                                         | Verification link                               |
| Password reset expiry   | 30 minutes                                       | 1 hour                                          |
| Failed queue jobs       | Requeued indefinitely                            | Limited retries, then dead-letter queue         |
| Rate limits             | Defaults + baseline                              | Stricter per-endpoint rules (from the monolith) |
| Publisher API           | `publishDomainEvent(routingKey, payload)` with branching | Typed `publishEmail({ template, to, data })` |
| Better Auth version     | 1.6.x                                            | 1.7.x                                           |

---

## Bringing philgeps features over

Each of these can be added without changing the architecture:

| Feature              | Where it goes                                                    |
| :------------------- | :--------------------------------------------------------------- |
| Redis                | `docker-compose.yml`; rate-limit `secondaryStorage` in each app  |
| React Email          | `apps/worker/emails/`, replacing `templates.ts`                  |
| Excel jobs           | New job types in `packages/core/src/queue/types.ts` + worker handlers |
| Extra user fields    | `user.additionalFields` in `accounts` + `accounts-db` schema     |
| Organizations, roles | Better Auth `organization` plugin in `accounts`                  |
| Dockerfiles          | One per app, built from the repo root with `turbo prune`         |

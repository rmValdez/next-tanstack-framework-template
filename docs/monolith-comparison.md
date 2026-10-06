# Comparison with next-betterAuth-monolith-template

This template is created **from** `next-betterAuth-monolith-template`. The monolith is not changed:
its auth logic and UI are copied into `apps/accounts`, and the multi-service parts are new.

---

## Shape

**Monolith:** one app does everything.

```
Browser → Next.js app (:3000)
            ├─ pages (login, dashboard, reset…)
            ├─ /api/auth (Better Auth)
            ├─ sendEmail() in-process
            └─ Prisma → one database
```

**Multi-service:** several apps, each with one job.

```
Browser → web (:5010) ──OIDC──→ accounts (:5011) ──queue──→ worker (:5012) → SMTP
            │                       │
          web_db               accounts_db
```

---

## Differences

| Area                   | Monolith                                             | Multi-service                                                        |
| :--------------------- | :--------------------------------------------------- | :------------------------------------------------------------------- |
| Apps                   | 1 Next.js app                                        | 2 Next.js apps + 1 Express worker                                    |
| Repo                   | Single package                                       | pnpm workspace + Turborepo (`apps/`, `packages/`)                    |
| Who owns login         | The app itself                                       | `accounts` only. Other apps never see passwords                     |
| How other apps sign in | Not possible                                         | OAuth 2.0 / OIDC through `accounts` (`genericOAuth`)                 |
| Better Auth plugins    | `emailAndPassword`                                   | accounts: + `jwt`, `oauthProvider` · web: `genericOAuth`             |
| Sessions               | One session cookie                                   | One per app (`accounts.*`, `web.*` cookie prefixes)                  |
| Databases              | 1 (`users`, `sessions`, `accounts`, `verifications`) | 1 per service: `accounts_db` (+ OAuth tables, JWKS), `web_db` (shadow users) |
| Prisma                 | 6, one schema                                        | 7 + `@prisma/adapter-pg`, one package per database                   |
| Email                  | `sendEmail()` inside the request                     | Published to RabbitMQ, sent by the worker, Mailpit in dev            |
| Email failure          | Logged, nothing retried                              | Retried, then dead-lettered                                          |
| Shared code            | `src/lib`, `src/components`                          | `packages/core`, `packages/ui`                                       |
| Env                    | `.env` in the app                                    | One root `.env`, each service validates its own part                 |
| Secrets                | 1 `AUTH_SECRET`                                      | One per service + OAuth client secret                                |
| Docker                 | Postgres                                             | Postgres (2 DBs), RabbitMQ, Mailpit                                  |
| Deploy                 | 1 container                                          | 3 containers, deployed and scaled independently                      |
| Adding a frontend      | Requires CORS/cookie changes                         | Copy `web`, register it as an OAuth client                           |

---

## Copied from the monolith

| Monolith source                                   | Goes to                                  |
| :------------------------------------------------ | :--------------------------------------- |
| `src/components/auth/LoginForm.tsx`               | `apps/accounts/src/components/auth/`     |
| `src/components/auth/ForgotPasswordForm.tsx`      | `apps/accounts/src/components/auth/`     |
| `src/components/auth/ResetPasswordForm.tsx`       | `apps/accounts/src/components/auth/`     |
| `src/app/{login,forgot-password,reset-password,email-verified}` | `apps/accounts/src/app/`   |
| `src/lib/auth.ts` (rate limits, verification, reset) | `apps/accounts/src/lib/auth.ts`        |
| `src/lib/config.ts` (`parseEnv`, `MIN_PASSWORD_LENGTH`) | `packages/core/src/env.ts`          |
| `src/lib/session.ts` (`requireAuth()`)            | `apps/accounts` and `apps/web`           |
| `src/hooks/useAuthSession.ts`, `src/providers/query-provider.tsx` | `apps/accounts` and `apps/web` |
| `src/components/ui/*`, `src/lib/utils.ts`         | `packages/ui`                            |
| `src/app/globals.css`, `tailwind.config.ts`       | `packages/ui` preset + each app          |
| `prisma/seed.ts` (admin user)                     | `packages/accounts-db/prisma/seed.ts`    |
| `.prettierrc`, `.prettierignore`, `LICENSE`       | Repo root                                |

## Replaced

| Monolith                 | Replaced by                                          |
| :----------------------- | :--------------------------------------------------- |
| `src/lib/email.ts`       | `publishEmail()` (core) + `apps/worker` templates    |
| `src/lib/prisma.ts`      | `@workspace/accounts-db`, `@workspace/web-db` clients |
| `prisma/schema.prisma`   | One schema per database package                      |
| `src/app/dashboard`      | `apps/web/src/app/dashboard` (behind OIDC sign-in)   |

---

## When to use which

| Use the monolith when…        | Use multi-service when…                         |
| :---------------------------- | :---------------------------------------------- |
| One app, one team             | Several apps share the same users               |
| Simple deploy matters most    | Apps need to deploy or scale separately         |
| No background jobs yet        | Emails or jobs shouldn't slow down requests     |

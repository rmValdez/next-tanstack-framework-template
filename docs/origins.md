# Origins

Where this template comes from, what was copied, and what deliberately differs. Both sources are
read-only references; never modify them.

| Source             | Path                                                                                        | Used for                                                                                                                                                                                                  |
| :----------------- | :------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monolith template  | `../next-betterAuth-monolith-template`                                                      | Auth forms, Better Auth config, rate limits, Zod env, `requireAuth()`, UI components, seed (copied into `accounts` and `packages/*`)                                                                      |
| philgeps workspace | `C:\Users\My PC\Documents\Github\personal\government-philgeps-workspace\philgeps-workspace` | The architecture: IdP `accounts` + client apps + worker in a Turborepo monorepo, TanStack Start + Bun. Reference for the TanStack Start apps (`apps/philgeps/src/lib/auth.ts`, `tanstackStartCookies()`). |

---

## Copied from the monolith

| Monolith source                                                            | Now in                                 |
| :------------------------------------------------------------------------- | :------------------------------------- |
| `src/components/auth/{LoginForm,ForgotPasswordForm,ResetPasswordForm}.tsx` | `apps/accounts/src/components/auth/`   |
| `src/app/{login,forgot-password,reset-password,email-verified}`            | `apps/accounts/src/app/`               |
| `src/lib/auth.ts` (rate limits, verification, reset)                       | `apps/accounts/src/lib/auth.ts`        |
| `src/lib/config.ts` (`parseEnv`, `MIN_PASSWORD_LENGTH`)                    | `packages/core/src/env.ts`             |
| `src/lib/session.ts` (`requireAuth()`)                                     | `src/lib/session.ts` in every Next app |
| `src/hooks/useAuthSession.ts`, `src/providers/query-provider.tsx`          | every Next app                         |
| `src/components/ui/*`, `src/lib/utils.ts`                                  | `packages/ui`                          |
| `globals.css`, `tailwind.config.ts`                                        | `packages/ui` preset + each app        |
| `prisma/seed.ts` (admin user)                                              | `packages/accounts-db/prisma/seed.ts`  |

Replaced: in-process `sendEmail()` → `publishEmail()` + `apps/worker`; one Prisma schema → one
package per database; the monolith dashboard → each domain app's `/dashboard` behind OIDC.

---

## Same as philgeps

Turborepo monorepo with `apps/` + `packages/` and one root `.env`; `accounts` as the identity
provider (Better Auth `jwt` + `oauthProvider`); client apps on `genericOAuth` with PKCE and a shadow
user refreshed by `overrideUserInfo`; a `cookiePrefix` per app; the 10-minute OAuth state cookie;
an Express + amqplib worker with nodemailer and Mailpit; the `/sso/start` health pre-flight.

## Deliberately different from philgeps

| Area                     | philgeps                                | This template                                              | Why                      |
| :----------------------- | :-------------------------------------- | :--------------------------------------------------------- | :----------------------- |
| Default framework        | TanStack Start everywhere               | Next.js, TanStack Start for exam/collaboration/workspace   | D14, D20                 |
| Package manager, lint    | Bun, Biome                              | pnpm, ESLint + Prettier                                    | D5, matches the monolith |
| Data ownership           | Apps import each other's `-db` packages | Own database per domain, cross-domain only via APIs/events | D17                      |
| App-to-app calls         | Shared database access                  | Accounts-issued JWT (client credentials)                   | D18                      |
| OAuth client secrets     | Plain text                              | SHA-256 hashed (plugin default)                            | D6                       |
| Login → authorize resume | Manual redirect with the raw query      | Signed `oauth_query`                                       | D7                       |
| Email verification       | OTP                                     | Link                                                       | D10                      |
| Failed queue jobs        | Requeued forever                        | Limited retries, then dead-letter queue                    | build log phase 5        |
| Email templates          | React Email                             | Plain escaped HTML                                         | D9                       |
| Redis                    | Included                                | Not in v1                                                  | D12                      |
| Better Auth              | 1.6.x                                   | 1.7.x (`signIn.social` for genericOAuth, no client plugin) | build log phase 6        |

Philgeps features that can be added later without changing the architecture: Redis rate-limit
storage, React Email, Excel jobs (new queue job types), extra user fields
(`user.additionalFields` in accounts), organizations/roles (Better Auth `organization` plugin),
per-app Dockerfiles built with `turbo prune`.

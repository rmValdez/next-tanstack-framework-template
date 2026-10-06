# Development Guide

Running, changing, and debugging the platform locally.

---

## Requirements

- Node.js 20+
- pnpm 10 (`corepack enable`)
- Docker (Postgres, RabbitMQ, Mailpit)
- Windows: PowerShell or Git Bash both work.

---

## First run

```bash
pnpm install
cp .env.example .env            # then replace the change-me secrets
docker compose up -d            # Postgres, RabbitMQ, Mailpit
pnpm db:setup                   # generate Prisma clients, migrate, seed
pnpm dev                        # every app and the worker
```

Then open any app, click **Sign in**, and use `admin@example.com` / `password123`:

| App           | URL                                   |
| :------------ | :------------------------------------ |
| hr            | http://localhost:5010                 |
| accounts      | http://localhost:5011                 |
| finance       | http://localhost:5013                 |
| recruitment   | http://localhost:5014                 |
| attendance    | http://localhost:5015                 |
| exam          | http://localhost:5016                 |
| worker health | http://localhost:5012/health          |
| Mailpit inbox | http://localhost:5004                 |
| RabbitMQ      | http://localhost:5002 (guest / guest) |

New accounts: sign up on accounts, open Mailpit, click the verification link, then sign in from
the app again.

---

## Scripts

Run from the repo root. Turborepo fans each one out to every app and package that defines it.

| Script             | What it does                                                      |
| :----------------- | :---------------------------------------------------------------- |
| `pnpm dev`         | All apps and the worker in watch mode                             |
| `pnpm build`       | Production build of every app                                     |
| `pnpm start`       | Run built apps                                                    |
| `pnpm type-check`  | `tsc --noEmit` everywhere                                         |
| `pnpm lint`        | ESLint everywhere                                                 |
| `pnpm format`      | Prettier on the whole repo                                        |
| `pnpm db:generate` | Generate every Prisma client                                      |
| `pnpm db:migrate`  | Create and apply a migration (interactive)                        |
| `pnpm db:deploy`   | Apply existing migrations                                         |
| `pnpm db:seed`     | Seed accounts (admin user, every OAuth client) and HR sample data |
| `pnpm db:setup`    | `db:generate` + `db:deploy` + `db:seed`                           |

One app or package:

```bash
pnpm --filter hr dev
pnpm --filter @workspace/hr-db db:migrate --name add_positions
pnpm --filter @workspace/accounts-db db:seed
```

---

## Making changes

### A schema change

```bash
# edit packages/<app>-db/prisma/schema.prisma
pnpm --filter @workspace/<app>-db db:migrate --name <change>
pnpm --filter @workspace/<app>-db db:generate     # Prisma 7 migrate dev does not generate
```

Commit the migration folder. Never edit an applied migration. Better Auth models in each schema come
from `pnpm auth:schema` (package `auth`, not `@better-auth/cli`); regenerate rather than hand-edit.

### Reading another domain's data

Never import another domain's `-db` package. Call the owner's `/api/v1` with an app token
([auth-flows.md](auth-flows.md#5-app-to-app-calls-d18)); `apps/finance/src/lib/hr-client.ts` is
the pattern.

### A new email

1. Add a variant to `EmailJob` in `packages/core/src/queue/types.ts`.
2. Add its template in `apps/worker/src/email/templates.ts`. TypeScript forces both sides to agree.
3. Call `publishEmail({ template: "<name>", to, data })` from the producing service.

### Shared UI

`packages/ui` is used by every app. Tailwind in each app scans `../../packages/ui/src/**`.

### A new app

[adding-a-service.md](adding-a-service.md).

---

## Debugging

| Symptom                                                                           | Likely cause / fix                                                                                                                                                                                                         |
| :-------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App exits with `Invalid server environment variables`                             | A variable in `.env` is missing or too short; the message lists each one.                                                                                                                                                  |
| `invalid_redirect_uri` on sign-in                                                 | `NEXT_PUBLIC_<APP>_URL` changed without re-seeding. Run `pnpm db:seed`.                                                                                                                                                    |
| Callback ends in `error=invalid_code`; app log: `invalid client_secret`           | `<APP>_OAUTH_CLIENT_SECRET` in `.env` differs from what was seeded. Run `pnpm db:seed` and restart the app.                                                                                                                |
| Token step returns 500; accounts log: `Failed to decrypt private key`             | `ACCOUNTS_AUTH_SECRET` changed; the stored JWKS key was encrypted with the old one. Dev: `DELETE FROM jwks` in `accounts_db` (a new key is created on the next request). Production: rotate keys, don't change the secret. |
| `state_mismatch` after login                                                      | Two sign-in attempts overwrote each other's state cookie, or the login took over 10 minutes. Retry once.                                                                                                                   |
| `invalid_signature` on `/login`                                                   | The login URL was edited or expired. Start sign-in again from the app.                                                                                                                                                     |
| "Sign out everywhere" leaves you on a blank accounts page                         | The client's `postLogoutRedirectUris` lacks the trailing-slash form `${appUrl}/`. Re-seed.                                                                                                                                 |
| Other apps still signed in after signing out                                      | Expected until global sign-out (roadmap step 2).                                                                                                                                                                           |
| Protected page returns 200 instead of 307 when signed out                         | A `loading.tsx` above the page streams the redirect. Remove it for guarded pages.                                                                                                                                          |
| API returns 500 on a duplicate instead of 409                                     | Matching Prisma errors with `instanceof` fails across bundled copies; match `error.code` (`P2002`).                                                                                                                        |
| No email in Mailpit                                                               | Worker not running, or RabbitMQ down. Check http://localhost:5012/health and the accounts log.                                                                                                                             |
| `pnpm build` logs `Discovery fetch failed for "accounts"`                         | Harmless when accounts isn't running; the build still succeeds.                                                                                                                                                            |
| Prisma: `@prisma/client did not initialize` / module `generated/client` not found | Run `pnpm db:generate`.                                                                                                                                                                                                    |

Useful views: RabbitMQ http://localhost:5002, Mailpit http://localhost:5004, a database:
`pnpm --filter @workspace/hr-db exec prisma studio`.

---

## Resetting everything

```bash
docker compose down -v          # deletes database and broker volumes (all local data)
docker compose up -d            # init.sql recreates databases and roles
pnpm db:setup
```

`init.sql` only runs on a new volume. To apply a change to it on an existing volume, run the new
statements by hand (`docker exec -i next_tanstack_tpl_db psql -U postgres < file.sql`).

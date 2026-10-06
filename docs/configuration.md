# Configuration

Every variable the template reads, where it is read, and what happens when it is wrong.

---

## How environment loading works

There is one `.env` file, at the repo root. Copy it from `.env.example`.

| Consumer             | How it loads the root `.env`                                                                                                                                                                                                       |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next apps            | `dotenv -e ../../.env --` in front of `next dev/build/start` (dotenv-cli). Not `@next/env` in `next.config.ts`: Next resets `process.env` to its startup snapshot when it loads the app folder's env files, dropping those values. |
| TanStack Start apps  | Decided in [roadmap](roadmap.md) step 3 (philgeps uses `--env-file=../../.env`).                                                                                                                                                   |
| Prisma CLI           | `dotenv` in each package's `prisma.config.ts`                                                                                                                                                                                      |
| Seed scripts, worker | `tsx --env-file=../../.env`                                                                                                                                                                                                        |

Each service validates only its own variables, with Zod, when its config module is imported. A
missing or invalid value stops the service at startup (and fails `next build`), with a list of every
problem. **Restart an app after changing `.env`.** `NEXT_PUBLIC_*` values are inlined into browser
bundles at build time; changing one requires a rebuild, not just a restart.

---

## Variables

The pattern is the same for every domain app `<app>` (`HR`, `FINANCE`, `RECRUITMENT`,
`ATTENDANCE`, `EXAM`, and later `CRM`, `OPERATIONS`, `ANALYTICS`, `COLLABORATION`, `WORKSPACE`).

### Shared

| Variable                   | Dev value                           | Read by                                        | Notes                                                                                          |
| :------------------------- | :---------------------------------- | :--------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| `NODE_ENV`                 | set by the tooling                  | all                                            | `production` disables dev-only logging.                                                        |
| `NEXT_PUBLIC_APP_ENV`      | `development`                       | Next apps                                      | `development` · `staging` · `production`                                                       |
| `NEXT_PUBLIC_ACCOUNTS_URL` | `http://localhost:5011`             | all                                            | Issuer base and accounts URL.                                                                  |
| `NEXT_PUBLIC_<APP>_URL`    | `http://localhost:<port>`           | accounts (`trustedOrigins`), the app, the seed | Also the base of the OAuth redirect and post-logout URIs. Read through `@workspace/core/urls`. |
| `RABBITMQ_URL`             | `amqp://guest:guest@localhost:5001` | accounts, worker                               |                                                                                                |

### accounts

| Variable                | Rule       | Notes                                                                                                                                                                              |
| :---------------------- | :--------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACCOUNTS_DATABASE_URL` | non-empty  | `accounts_db`                                                                                                                                                                      |
| `ACCOUNTS_AUTH_SECRET`  | ≥ 32 chars | Signs sessions and the `/login` OAuth query, and **encrypts the stored JWKS private key**: changing it makes that key unreadable (see [development.md](development.md#debugging)). |

### Each domain app

| Variable                    | Rule       | Notes                                                                  |
| :-------------------------- | :--------- | :--------------------------------------------------------------------- |
| `<APP>_DATABASE_URL`        | non-empty  | The app's own database (see below).                                    |
| `<APP>_SHADOW_DATABASE_URL` | —          | Only for `prisma migrate dev`.                                         |
| `<APP>_AUTH_SECRET`         | ≥ 32 chars | Must differ from every other secret.                                   |
| `<APP>_OAUTH_CLIENT_ID`     | non-empty  | Equals the app name; must match the seeded client.                     |
| `<APP>_OAUTH_CLIENT_SECRET` | ≥ 32 chars | Stored hashed in `accounts_db`. After changing it, run `pnpm db:seed`. |

Database URLs:

|                             | Today (`company_db`, D13)                                                | After [roadmap](roadmap.md) step 1 (D17)                  |
| :-------------------------- | :----------------------------------------------------------------------- | :-------------------------------------------------------- |
| `<APP>_DATABASE_URL`        | `postgresql://<app>_app:<app>_pw@localhost:5000/company_db?schema=<app>` | `postgresql://<app>_app:<app>_pw@localhost:5000/<app>_db` |
| `<APP>_SHADOW_DATABASE_URL` | `…/<app>_shadow?schema=<app>`                                            | `…/<app>_shadow`                                          |

### worker

| Variable                 | Default                                       | Notes                              |
| :----------------------- | :-------------------------------------------- | :--------------------------------- |
| `WORKER_PORT`            | `5012`                                        | Health endpoint port.              |
| `SMTP_HOST`              | `localhost`                                   | Mailpit in development.            |
| `SMTP_PORT`              | `5003`                                        | Port 465 switches on implicit TLS. |
| `SMTP_USER`, `SMTP_PASS` | empty                                         | Leave empty for Mailpit.           |
| `SMTP_FROM`              | `Next TanStack Template <no-reply@localhost>` | Sender for all mail.               |

### Not read by anything yet

`ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_EXPIRY` exist in the local `.env` (added by hand). Candidate
use: accounts' `accessTokenExpiresIn` / `refreshTokenExpiresIn`. Decide before wiring.

---

## Ports

| What                                                           | Port                         |     | What            | Port                 |
| :------------------------------------------------------------- | :--------------------------- | :-- | :-------------- | :------------------- |
| `hr`                                                           | 5010                         |     | PostgreSQL      | 5000                 |
| `accounts`                                                     | 5011                         |     | RabbitMQ (AMQP) | 5001                 |
| `worker` health                                                | 5012                         |     | RabbitMQ UI     | 5002 (guest / guest) |
| `finance`                                                      | 5013                         |     | Mailpit SMTP    | 5003                 |
| `recruitment`                                                  | 5014                         |     | Mailpit inbox   | 5004                 |
| `attendance`                                                   | 5015                         |     |                 |                      |
| `exam`                                                         | 5016                         |     |                 |                      |
| `crm`, `operations`, `analytics`, `collaboration`, `workspace` | 5017–5021 (proposed, step 4) |     |                 |                      |

Docker ports bind to `127.0.0.1` only, so the databases and broker are not reachable from the
network.

---

## Changing a URL or port

The OAuth redirect and post-logout URIs are stored in `accounts_db`. When `NEXT_PUBLIC_<APP>_URL`
changes:

1. Update `.env` (and the app's `-p` port in its `package.json` if the port changed).
2. Run `pnpm db:seed` (the seed upserts every client from `.env`).
3. Restart accounts and the app (rebuild for production).

Otherwise accounts rejects the handshake with `invalid_redirect_uri`.

# Configuration

Every variable the template reads, where it is read, and what happens when it is wrong.

---

## How environment loading works

There is one `.env` file, at the repo root. Copy it from `.env.example`.

| Consumer         | How it loads the root `.env`                                      |
| :--------------- | :---------------------------------------------------------------- |
| Next apps        | `loadEnvConfig(<repo root>)` from `@next/env` at the top of `next.config.ts` |
| Prisma CLI       | `dotenv` in each package's `prisma.config.ts`                     |
| Seed scripts     | `tsx --env-file=../../.env`                                       |
| Worker           | `tsx --env-file=../../.env`                                       |

Each service validates only its own variables, with Zod, when its config module is imported. A
missing or invalid value stops the service at startup (and fails `next build`), with a list of
every problem.

`NEXT_PUBLIC_*` values are inlined into browser bundles at build time. Changing one requires a
rebuild, not just a restart.

---

## Variables

### Shared

| Variable                   | Default (dev)            | Read by           | Notes                                    |
| :------------------------- | :----------------------- | :---------------- | :--------------------------------------- |
| `NODE_ENV`                 | set by the tooling       | all               | `production` disables dev-only logging.  |
| `NEXT_PUBLIC_APP_ENV`      | `development`            | Next apps         | `development` · `staging` · `production` |
| `NEXT_PUBLIC_ACCOUNTS_URL` | `http://localhost:5011`  | all               | Issuer URL and `accounts` base URL.      |
| `NEXT_PUBLIC_WEB_URL`      | `http://localhost:5010`  | accounts, web, seed | Used for `trustedOrigins` and the redirect URI. |

### accounts

| Variable                | Required | Rule                 | Notes                                          |
| :---------------------- | :------- | :------------------- | :--------------------------------------------- |
| `ACCOUNTS_DATABASE_URL` | yes      | non-empty            | `accounts_db`                                  |
| `ACCOUNTS_AUTH_SECRET`  | yes      | ≥ 32 chars           | Signs sessions and the `/login` OAuth query.   |
| `RABBITMQ_URL`          | yes      | `amqp://` URL        | Email jobs are published here.                 |

### web

| Variable                  | Required | Rule        | Notes                                                |
| :------------------------ | :------- | :---------- | :--------------------------------------------------- |
| `WEB_DATABASE_URL`        | yes      | non-empty   | `web_db`                                             |
| `WEB_AUTH_SECRET`         | yes      | ≥ 32 chars  | Must differ from `ACCOUNTS_AUTH_SECRET`.             |
| `WEB_OAUTH_CLIENT_ID`     | yes      | non-empty   | Must match the client seeded in `accounts_db`.       |
| `WEB_OAUTH_CLIENT_SECRET` | yes      | ≥ 32 chars  | Stored hashed in `accounts_db`; plain here only.     |

### worker

| Variable      | Default              | Notes                                         |
| :------------ | :------------------- | :-------------------------------------------- |
| `RABBITMQ_URL`| —                    | Same broker as `accounts`.                    |
| `WORKER_PORT` | `5012`               | Health endpoint port.                         |
| `SMTP_HOST`   | `localhost`          | Mailpit in development.                       |
| `SMTP_PORT`   | `5003`               | Port 465 switches on implicit TLS.            |
| `SMTP_USER`, `SMTP_PASS` | empty     | Leave empty for Mailpit.                      |
| `SMTP_FROM`   | `Next TanStack Template <no-reply@localhost>` | Sender for all mail.        |

---

## Ports

| What               | Port  |
| :----------------- | :---- |
| `web`              | 5010  |
| `accounts`         | 5011  |
| `worker` health    | 5012  |
| PostgreSQL         | 5000  |
| RabbitMQ (AMQP)    | 5001  |
| RabbitMQ UI        | 5002 (guest / guest) |
| Mailpit SMTP       | 5003  |
| Mailpit inbox      | 5004  |

Docker ports bind to `127.0.0.1` only, so the databases and broker are not reachable from the
network.

---

## Changing a URL or port

The OAuth redirect URI is stored in `accounts_db`. When `NEXT_PUBLIC_WEB_URL` changes:

1. Update `.env`.
2. Re-run `pnpm db:seed` (the seed upserts the client's redirect URIs).
3. Restart both apps (rebuild for production).

Otherwise `accounts` rejects the handshake with `invalid_redirect_uri`.

# Deployment

What changes between local development and production. Read this before the first deploy.

---

## Topology

| Service    | Typical host                      | Scales by                              |
| :--------- | :-------------------------------- | :------------------------------------- |
| `accounts` | `accounts.example.com`            | Instances behind a load balancer       |
| `web`      | `app.example.com`                 | Instances behind a load balancer       |
| `worker`   | Private (no public ingress)       | More consumers on the same queue       |
| PostgreSQL | Managed (one server, two DBs, or one server per DB) | Vertical / read replicas |
| RabbitMQ   | Managed (CloudAMQP, Amazon MQ) or self-hosted | Cluster               |
| SMTP       | Resend, Postmark, SES, …          | Provider                               |

Each Next app builds with `output: "standalone"` and runs in its own container. The worker runs
`tsx src/index.ts`. Bundle it with esbuild if you want a plain `node` entry point.

---

## Pre-deploy checklist

### Secrets and URLs

- [ ] New random values for `ACCOUNTS_AUTH_SECRET`, `WEB_AUTH_SECRET`, `WEB_OAUTH_CLIENT_SECRET`
      (`openssl rand -base64 32`). Never reuse the `.env.example` values.
- [ ] `NEXT_PUBLIC_ACCOUNTS_URL` and `NEXT_PUBLIC_WEB_URL` set to the real HTTPS URLs **at build time**.
- [ ] OAuth client re-seeded (or updated) with the production redirect URI.
- [ ] Seeded admin password changed, or the admin seed removed from production.

### Auth

- [ ] HTTPS everywhere. Better Auth sets `Secure` cookies when `NODE_ENV=production`.
- [ ] `trustedOrigins` lists exactly the deployed client URLs.
- [ ] Rate-limit storage moved off memory (see below) if any service runs more than one instance.

### Email

- [ ] `SMTP_*` pointed at a real provider, with SPF/DKIM set up for the `SMTP_FROM` domain.
- [ ] Dead-letter queue (`email.dlq`) monitored.

### Data

- [ ] `pnpm db:deploy` runs as a release step, before new app instances start.
- [ ] Backups enabled for both databases.
- [ ] Database URLs use TLS (`?sslmode=require`) where the provider supports it.

---

## Scaling concerns

| Concern                | Single instance | Multiple instances                                              |
| :--------------------- | :-------------- | :-------------------------------------------------------------- |
| Rate limiting          | In-memory works | Switch to `storage: "database"` (adds a table) or Redis `secondaryStorage`; otherwise each instance has its own limit |
| Sessions               | DB-backed       | DB-backed already; no sticky sessions needed                    |
| Prisma connections     | Pool per process | Use a pooler (PgBouncer, Prisma Accelerate) when instances × pool size nears the DB limit |
| Worker throughput      | `prefetch(5)`   | Add worker replicas; RabbitMQ round-robins jobs                 |
| JWKS                   | Stored in `accounts_db` | Shared by all accounts instances automatically          |

---

## Cookies across subdomains

Sessions are per app on purpose: `web` holds its own session, created by the OIDC handshake, so the
apps do not need a shared parent-domain cookie. Keep `crossSubDomainCookies` off. Turning it on
would let any subdomain read `accounts` sessions.

---

## Health checks

| Service    | Endpoint                         | Healthy when                     |
| :--------- | :------------------------------- | :------------------------------- |
| `accounts` | `GET /api/health`                | DB reachable                     |
| `web`      | `GET /api/health`                | DB reachable                     |
| `worker`   | `GET :5012/health`               | Broker connection open           |

`web`'s `/sso/start` calls `accounts` `/api/health` before redirecting, so users see a clear
"sign-in unavailable" message instead of a browser connection error when `accounts` is down.

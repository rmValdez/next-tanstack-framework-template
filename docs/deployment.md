# Deployment

What changes between local development and production. Read this before the first deploy. Nothing
here has been deployed yet; this is the checklist the design implies.

---

## Topology

| Service                     | Typical host                                                                        | Scales by                                       |
| :-------------------------- | :---------------------------------------------------------------------------------- | :---------------------------------------------- |
| `accounts`                  | `accounts.example.com`                                                              | Instances behind a load balancer                |
| Each domain app             | `<app>.example.com` (hr, finance, …)                                                | Instances behind a load balancer, independently |
| `worker`                    | Private (no public ingress)                                                         | More consumers on the same queue                |
| Domain workers (D16, later) | Private                                                                             | Per domain                                      |
| PostgreSQL                  | Managed; one database per domain + `accounts_db`, on one server or split per domain | Per database                                    |
| RabbitMQ                    | Managed (CloudAMQP, Amazon MQ) or self-hosted                                       | Cluster                                         |
| SMTP                        | Resend, Postmark, SES, …                                                            | Provider                                        |

Next apps build with `output: "standalone"` and run in their own container. TanStack Start apps build
to a Nitro server output (step 3 decides the details). The worker runs `tsx src/index.ts`.

---

## Pre-deploy checklist

### Secrets and URLs

- [ ] New random values for every `*_AUTH_SECRET` and `*_OAUTH_CLIENT_SECRET`
      (`openssl rand -base64 32`). Never reuse `.env.example` values.
- [ ] `ACCOUNTS_AUTH_SECRET` is final before first start: it encrypts the JWKS private key.
- [ ] `NEXT_PUBLIC_*_URL` set to the real HTTPS URLs **at build time**.
- [ ] Accounts seed (or an admin script) run with production URLs: redirect URIs, post-logout URIs
      (`https://<app>.example.com/`, trailing slash), resources and client links.
- [ ] Seeded admin password changed, or the admin seed removed from production.

### Databases

- [ ] One database and one role per domain; each role can connect only to its own database
      (`REVOKE CONNECT … FROM PUBLIC`).
- [ ] Separate migrator role (DDL) and runtime role (DML only) per domain.
- [ ] `pnpm db:deploy` runs as a release step, before new instances start.
- [ ] Backups per database; URLs with `?sslmode=require` where supported.

### Auth

- [ ] HTTPS everywhere (Better Auth sets `Secure` cookies when `NODE_ENV=production`).
- [ ] `trustedOrigins` lists exactly the deployed app URLs.
- [ ] Global sign-out (D19) works across all deployed apps.
- [ ] Rate-limit storage moved off memory if any app runs more than one instance.

### Email

- [ ] `SMTP_*` pointed at a real provider, SPF/DKIM for the `SMTP_FROM` domain.
- [ ] Dead-letter queues (`email.dlq`, later `<domain>.domain-events.dlq`) monitored.

---

## Scaling concerns

| Concern            | Single instance    | Multiple instances                                                 |
| :----------------- | :----------------- | :----------------------------------------------------------------- |
| Rate limiting      | In-memory works    | `storage: "database"` or Redis `secondaryStorage` (reopens D12)    |
| Sessions           | DB-backed          | Already DB-backed; no sticky sessions                              |
| Prisma connections | Pool per process   | A pooler (PgBouncer) when instances × pool size nears the DB limit |
| Worker throughput  | `prefetch(5)`      | Add replicas; RabbitMQ round-robins                                |
| JWKS               | In `accounts_db`   | Shared by all accounts instances                                   |
| App tokens (D18)   | Cached per process | Cached per instance; fine (short-lived, cheap to fetch)            |

---

## Cookies across subdomains

Sessions are per app on purpose (D1). Keep `crossSubDomainCookies` off: it would let any subdomain
read accounts sessions.

---

## Health checks

| Service         | Endpoint           | Healthy when                           |
| :-------------- | :----------------- | :------------------------------------- |
| `accounts`      | `GET /api/health`  | `accounts_db` reachable                |
| Each domain app | `GET /api/health`  | Its own database reachable             |
| `worker`        | `GET :5012/health` | Broker connection open (503 otherwise) |

Each app's `/sso/start` calls accounts `/api/health` before redirecting, so users see "sign-in
unavailable" instead of a browser connection error when accounts is down.

# Adding a Service

The template ships one client app (`web`). Real projects add more, for example `admin` or
`marketplace`. This guide covers both kinds of service.

---

## A new client app (signs in through accounts)

Example: `admin` on port 5013.

### 1. Database package

```bash
cp -r packages/web-db packages/admin-db
```

- Rename the package to `@workspace/admin-db`.
- Point `prisma.config.ts` and `src/client.ts` at `ADMIN_DATABASE_URL`.
- Change the globalThis cache key in `src/client.ts` to `adminDb` (a shared key would hand one
  app another app's database client in development).
- Add `CREATE DATABASE admin_db;` to `docker/postgres/init.sql`, or run it manually on an
  existing volume.

### 2. App

```bash
cp -r apps/web apps/admin
```

| File                          | Change                                                       |
| :---------------------------- | :----------------------------------------------------------- |
| `package.json`                | `name: "admin"`, dev/start port `5013`, depend on `@workspace/admin-db` |
| `src/lib/auth.ts`             | `cookiePrefix: "admin"`, admin-db client, `ADMIN_OAUTH_CLIENT_*` |
| `src/lib/config.server.ts`    | `ADMIN_DATABASE_URL`, `ADMIN_AUTH_SECRET`, `ADMIN_OAUTH_CLIENT_*` |

### 3. Register the client in accounts

- Add an entry to the clients list in `packages/accounts-db/prisma/seed.ts` with the redirect URI
  `http://localhost:5013/api/auth/callback/accounts`.
- Add `NEXT_PUBLIC_ADMIN_URL` to `trustedOrigins` in `apps/accounts/src/lib/auth.ts`.

### 4. Environment

Add to `.env.example`, `.env`, and `turbo.json` `globalEnv`:

```
NEXT_PUBLIC_ADMIN_URL=http://localhost:5013
ADMIN_DATABASE_URL=postgresql://postgres:postgres@localhost:5000/admin_db
ADMIN_AUTH_SECRET=<32+ chars>
ADMIN_OAUTH_CLIENT_ID=admin
ADMIN_OAUTH_CLIENT_SECRET=<32+ chars>
```

### 5. Apply

```bash
pnpm install
pnpm setup
pnpm dev
```

**Checklist:** unique port · unique cookie prefix · own database · own auth secret · client seeded
with an exact redirect URI · URL in `trustedOrigins`.

---

## A new background service

Example: a `reports` worker consuming a `reports` queue.

1. Add the queue name and job types to `packages/core/src/queue/types.ts`.
2. Either add a consumer to `apps/worker`, or copy `apps/worker` to `apps/reports` if the jobs need
   to scale or deploy separately.
3. Publish from the producing service with a typed helper, as `publishEmail()` does.

Keep the rule from [ARCHITECTURE.md](../ARCHITECTURE.md): services share types through
`packages/core`, never each other's code or tables. If a worker needs data, pass it in the job or
have it call the owning service's API.

---

## A non-Next client (mobile, SPA, another backend)

`accounts` is a standard OIDC provider, so any OIDC client library works:

- Discovery: `NEXT_PUBLIC_ACCOUNTS_URL/api/auth/.well-known/openid-configuration`
- Register it as a client in the seed. Public clients (mobile, SPA) use PKCE without a secret.
- Add its origin to `trustedOrigins` if it calls `accounts` from a browser.

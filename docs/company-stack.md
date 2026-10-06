# Company Stack

Which framework and libraries to use for which kind of application, and what this template already
contains. Decision: [D14](decisions.md#d14-nextjs-default-tanstack-libraries-tanstack-start-by-exception).

---

## The rule

> **Next.js is the default application framework. TanStack libraries are approved in every
> application. TanStack Start may be used for an application with a documented technical reason.**

One default means no framework debate per project, shared patterns and tooling, and easier
onboarding. TanStack libraries are not an alternative to Next.js; they run inside it.

---

## Stack

| Layer | Choice | In this template |
| :--- | :--- | :--- |
| Application framework | Next.js 15 (App Router) | ✅ `accounts`, `web` |
| Client server-state | TanStack Query | ✅ session state (`useAuthSession`) |
| Identity | Better Auth, central `accounts` as OIDC provider | ✅ |
| Data | PostgreSQL + Prisma 7, each domain owns its data | ✅ ([shared-database variant](shared-database/README.md) documented) |
| Async jobs and events | RabbitMQ (amqplib) | ✅ email queue + worker |
| Tables | TanStack Table | Recommended, not included yet |
| Forms | TanStack Form | Recommended, not included yet |
| Real-time | Socket.IO / WebSocket | Recommended, not included yet (needs a design: see below) |
| Specialized framework | TanStack Start (+ TanStack Router) | Approved exception, no example client yet |

"Not included yet" items are planned as later phases in the
[implementation plan](implementation-plan.md#later-phases).

---

## Which to use

| Application | Recommended |
| :--- | :--- |
| Accounts / identity | Next.js |
| Public websites, careers / recruitment | Next.js |
| General business apps | Next.js + TanStack Query |
| HR, finance, attendance (data-heavy internal) | Next.js + TanStack Query, Table, Form |
| Highly interactive dashboards | Next.js + TanStack + Socket.IO |
| Trading / operations-style UI, specialized internal tools | TanStack Start + Router, Query, Table, Form + WebSocket, **when justified** |

### What counts as a documented reason for TanStack Start

Not "the app has big tables" or "we use TanStack Query": those work in Next.js. Valid reasons are
the things Start does differently:

- A fully type-safe router (typed params, search params, links) is central to the app.
- The app is essentially a client-side SPA with loader-based data fetching, where React Server
  Components add complexity without benefit.
- The team has an existing TanStack Start codebase to extend (philgeps).

Write the reason in the app's README before starting.

---

## How any app plugs in

Framework choice doesn't change the architecture, because every boundary is a protocol:

| Boundary | Protocol | Works the same for Next.js and TanStack Start |
| :--- | :--- | :--- |
| Sign-in | OIDC (authorization code + PKCE) against `accounts` | ✅ Better Auth `genericOAuth` in either framework (philgeps does this on Start) |
| Own data | Own database or own schema | ✅ Prisma is framework-independent |
| Background work | RabbitMQ jobs/events typed in `@workspace/core` | ✅ |
| Shared UI | `@workspace/ui` React components + Tailwind preset | ✅ both are React |

A new client app is registered as an OAuth client in `accounts` and follows
[adding-a-service.md](adding-a-service.md), whichever framework it uses.

---

## Real-time: open design questions

Socket.IO is recommended but not designed yet. Before adding it:

1. **Where the socket server runs.** Next.js route handlers don't hold long-lived connections well; a
   separate Node service (like `worker`) is the usual home.
2. **How sockets authenticate.** Validate an access token from `accounts` (JWT, checked against
   `/api/auth/jwks`) on connect, rather than sharing session cookies across services.
3. **Scaling.** More than one instance needs sticky sessions and a shared adapter (Redis or the
   RabbitMQ adapter), which reopens the "no Redis in v1" decision (D12).
4. **Events in.** Domain events from RabbitMQ fanned out to connected clients.

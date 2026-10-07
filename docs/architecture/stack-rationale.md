# Company Stack

Which framework and libraries each application uses, and why. Decisions:
[D14](decisions.md#d14-nextjs-default-tanstack-libraries-tanstack-start-where-justified),
[D20](decisions.md#d20-final-application-list-and-framework-per-app).

---

## The rule

> **Next.js is the default. TanStack libraries are approved in every app. TanStack Start is used
> for the highly interactive apps: `exam`, `collaboration`, `workspace`.**

TanStack libraries are not an alternative to Next.js; they run inside it. TanStack Start is a
different framework, chosen per app for a reason written down here.

---

## Applications

| App             | Framework          | TanStack in it             | Why this framework                                                                                |
| :-------------- | :----------------- | :------------------------- | :------------------------------------------------------------------------------------------------ |
| `accounts`      | Next.js            | Query                      | Identity provider; forms and redirects                                                            |
| `hr`            | Next.js            | Query, Table, Form         | CRUD, records, administration                                                                     |
| `finance`       | Next.js            | Query, Table, Form         | Data-heavy business screens                                                                       |
| `recruitment`   | Next.js            | Query, Table, Form         | Pipelines and forms                                                                               |
| `attendance`    | Next.js            | Query (+ realtime later)   | Records and schedules                                                                             |
| `crm`           | Next.js            | Query, Table, Form         | Conventional business app                                                                         |
| `operations`    | Next.js            | Query, Table, Form         | Workflows and forms                                                                               |
| `analytics`     | Next.js            | Query, Table               | Reports and dashboards                                                                            |
| `exam`          | **TanStack Start** | Router, Query, Form        | Live countdown, question navigation, autosave, optimistic answers, recovery after connection loss |
| `collaboration` | **TanStack Start** | Router, Query              | Realtime state, presence, rapidly changing UI                                                     |
| `workspace`     | **TanStack Start** | Router, Query, Table, Form | Complex client state for projects and tasks                                                       |
| `worker`        | Node.js (Express)  | none                       | Background jobs; no UI                                                                            |

State on 2026-10-07: `accounts`, `hr`, `finance`, `worker` built; `recruitment`, `attendance` and
`exam` scaffolded (`exam` on TanStack Start since step 3); `crm`,
`operations`, `analytics` (Next.js) and `collaboration`, `workspace` (TanStack Start) scaffolded
(step 4).

---

## Shared stack

| Layer                   | Choice                                                                          |
| :---------------------- | :------------------------------------------------------------------------------ |
| Identity                | Better Auth; `accounts` is the OIDC provider for every app                      |
| App-to-app calls        | Accounts-issued JWT access tokens (client credentials) to the owner's `/api/v1` |
| Data                    | PostgreSQL + Prisma 7, one database per domain (`<app>_db`)                     |
| Background work, events | RabbitMQ (amqplib): email queue today, domain events planned (D16)              |
| UI                      | `@workspace/ui` React components + Tailwind preset (works in both frameworks)   |
| Client data             | TanStack Query in every UI app                                                  |
| Tables, forms           | TanStack Table v9, TanStack Form v1 (Zod schemas shared with the API)           |
| Realtime                | Inside the TanStack Start apps when built (collaboration first); design open    |

---

## Valid reasons for TanStack Start

Not "the app has big tables" or "we use TanStack Query": those work in Next.js. Valid reasons are
what Start does differently:

- Most of the app is long-lived client state (timers, live sessions, collaborative editing) where
  React Server Components add complexity without benefit.
- A fully type-safe router (typed params, search params, links) is central to the app.
- Loader-based data fetching with optimistic updates is the main interaction pattern.

A new TanStack Start app needs its reason added to the table above.

---

## How any app plugs in

Framework choice doesn't change the architecture, because every boundary is a protocol:

| Boundary            | Protocol                              | Next.js                                      | TanStack Start                                                   |
| :------------------ | :------------------------------------ | :------------------------------------------- | :--------------------------------------------------------------- |
| Sign-in             | OIDC (code + PKCE) against `accounts` | Better Auth `genericOAuth` + `nextCookies()` | Better Auth `genericOAuth` + `tanstackStartCookies()` (philgeps) |
| Own data            | Own `<app>_db` via Prisma             | ✅                                           | ✅                                                               |
| Other domains' data | Owner's `/api/v1` with an app token   | ✅                                           | ✅                                                               |
| Background work     | RabbitMQ, types in `@workspace/core`  | ✅                                           | ✅                                                               |
| Shared UI           | `@workspace/ui`                       | ✅                                           | ✅                                                               |

New apps follow [../guides/adding-a-service.md](../guides/adding-a-service.md), whichever framework they use.

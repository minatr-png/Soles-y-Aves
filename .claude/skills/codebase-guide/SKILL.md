---
name: codebase-guide
description: Living map of the soles-y-aves ("Ahorros") codebase — routes, data layer, domain model (household/accounts/categories/transactions), auth flow, database schema, and conventions, so Claude doesn't have to re-explore the repo from scratch. Load this before searching the repo to understand how something works or where it lives, before adding or changing a route/component/Supabase query/business rule, and before touching auth, filtering, or the transaction/category/account model. This is also the skill to use for anything database-related — adding/renaming/dropping a table or column, changing a constraint or enum value, writing a migration, or the user just describing a schema change they made in the Supabase dashboard — since it points at `SCHEMA.sql` (the DDL source of truth) and the digest of it that Claude reasons from. Also load it any time a change you're making adds, removes, moves, or renames a file/route/dependency, changes an entity or business rule, or introduces a new convention — because this file (and `SCHEMA.sql` for DB changes) must be updated in the same edit so neither goes stale. Use even if the user doesn't say "skill", "structure", or "database" — any nontrivial change to this repo, including any DB structure change, should consult it first.
---

# soles-y-aves codebase guide

This is a living reference for the **soles-y-aves** repo, product name **"Ahorros"** — a private,
two-person household savings/expense tracker (manual entry, no bank sync, Spanish UI, EUR). It exists
so you don't have to re-derive the architecture by grepping the repo every time. Read it fully before
making changes; then **update it** as part of any change that makes a section below inaccurate (see
"Keeping this file current" at the end — that part is not optional).

## Non-standard Next.js — read this before touching routing

This project pins `next@16.3.4`, which has real breaking changes vs. the Next.js you likely have in
training data. **Before writing anything routing/data-fetching/caching related, check
`node_modules/next/dist/docs/`** (bundled with this exact version) rather than assuming older
Next.js conventions — `AGENTS.md`/`CLAUDE.md` at the repo root enforce this same rule.

The one that bites most often: **`middleware.ts` has been renamed `proxy.ts`** (same mechanism, new
name/export). This repo's root **`proxy.ts`** is the real auth gate — see "Auth" below. If you're
about to create `middleware.ts`, don't; extend `proxy.ts` instead.

## Stack at a glance

- **Next.js 16 (App Router)**, React 19, TypeScript (strict), path alias `@/*` → repo root. No `src/`
  dir — `app/`, `components/`, `lib/` live at repo root.
- **Supabase** (Postgres + Auth) via `@supabase/supabase-js` + `@supabase/ssr`. No ORM, no
  Prisma/Drizzle — direct `.from(table).select()`-style queries.
- **Tailwind CSS v4**, config-less (CSS-based, in `app/globals.css` via `@import "tailwindcss"` +
  `@theme inline`) — no `tailwind.config.*` file. No component library (no shadcn/Radix/MUI); every
  UI primitive is hand-rolled bespoke "glassmorphic" CSS in `app/globals.css`.
- No state-management or data-fetching library (no React Query/SWR/Zustand/Redux) — see "Data flow"
  below for the actual pattern.
- No test framework configured (no Jest/Vitest/Playwright, no `*.test.*` files). `npm run lint`
  (ESLint flat config, `eslint-config-next`) is the only automated check. No CI (`.github/workflows`),
  no `vercel.json`/Dockerfile — deploy config lives outside the repo (Vercel git integration).
- `npm run dev` / `build` / `start` / `lint` are the only scripts.

## Routes (`app/`)

```
app/layout.tsx           root layout: <html>/<body>, Archivo font, metadata, viewport
app/globals.css          all custom CSS — design tokens + component classes (Tailwind utilities used inline too)
app/manifest.ts          PWA manifest
app/actions.ts           "use server" — signOut()
app/login/               public route, outside the (app) group — no app chrome
  page.tsx, login-form.tsx ("use client", 2-step email→OTP UI), actions.ts ("use server": sendCode, verifyCode)
app/(app)/               route group — authenticated app shell, no URL segment of its own
  layout.tsx             background blobs, Suspense-streamed <ChromeHeader/>, wraps children in MovementSheetProvider
  loading.tsx
  page.tsx                "/"            → Panel (monthly dashboard)
  ano/page.tsx            "/ano"         → Año (yearly overview)
  movimientos/page.tsx    "/movimientos" → Movimientos (transaction list/filter/search)
  ajustes/page.tsx        "/ajustes"     → Categorías y cuentas (category/account admin)
```

No `route.ts` API handlers anywhere — all reads go through Server Components calling `lib/data.ts`
directly; all writes are client-side calls into `lib/mutations.ts`. No `error.tsx`/`not-found.tsx` yet.

Filter/scope state is deliberately kept in the **URL**, not component state: `owner` (person filter,
all four routes), `y`/`m` (year/month — Panel, Año), `t`/`cat`/`from`/`to`/`q` (Movimientos). This is a
repo-wide convention (so a given view is always linkable/shareable) — new filters should follow it
rather than introducing local-only state.

## `components/` — one file per view/concern, all client components

Kebab-case filenames, PascalCase exports, `"use client"` at the top of every file (nothing here is a
server component). Key files: `panel-view.tsx`, `ano-view.tsx`, `movimientos-view.tsx`,
`ajustes-view.tsx` (one per route above), `chrome-header.tsx` (header + person filter + tab bar, plus
a `ChromeHeaderFallback` for its Suspense boundary), `movement-sheet.tsx` (global add/edit bottom
sheet + its own React Context provider/hook, mounted once in `(app)/layout.tsx`),
`link-pending-watcher.tsx` (uses `useLinkStatus()` to show an "Actualizando…" toast during in-flight
`<Link>` navigation).

**Pending-state UX pattern**, used repeatedly (`chrome-header.tsx`, `panel-view.tsx`, `ano-view.tsx`,
delete-in-`movimientos-view.tsx`): set a local "pending" value immediately on click/action, compare it
against the real value during render, and let it reset once the URL/props/mutation catch up. This
masks Next.js navigation and mutation latency without an effect. Follow this pattern for new
interactive filters/actions rather than adding a spinner-and-await.

## `lib/` — one concern per file, kebab-case

- **`data.ts`** — reads only, `import "server-only"`, every export wrapped in React `cache()` to dedupe
  per-request Supabase calls (layout + page often want the same data). Exports: `getHousehold`,
  `listMembers`, `listAccounts`, `listCategories`, `listTransactionsForYear`, `listAllTransactions`.
- **`mutations.ts`** — writes, deliberately **not** server-only — called straight from `"use client"`
  components using the browser's already-authenticated session. Exports: `createTransaction`,
  `createCategory`, `renameCategory`, `archiveCategory`, `createAccount`, `renameAccount`,
  `updateAccountOwner`, `archiveAccount`, `deleteTransaction`, `updateTransaction`. Callers call
  `router.refresh()` after a successful write to re-run the Server Component fetch (no server actions
  for CRUD — only auth uses server actions).
- **`derive.ts`** — pure, framework-agnostic aggregation/derivation logic shared by Panel/Año/
  Movimientos (owner/month/year scoping, totals, category rankings, donut math, balances, month
  labels). This is the business-logic layer — see "Domain model" below for the rules it encodes; this
  is "the easy thing to break" per in-code comments, so double-check aggregation changes here.
- **`format.ts`** — `Intl.NumberFormat('es-ES', ...)` money helpers: `money`, `money2`, `moneyBalance`,
  `signed`.
- **`supabase/client.ts`** — browser client (`createBrowserClient`). **`supabase/server.ts`** — server
  client (`createServerClient`, `"server-only"`, cookie-based session). **`supabase/types.ts`** —
  hand-written types mirroring the DB schema (`Household`, `HouseholdMember`, `Account`, `Category`,
  `Transaction`, `MovementKind`).

No `hooks/`, `utils/`, `types/`, or `styles/` top-level dirs — everything colocates under `lib/` and
`components/`. No barrel/index re-export files anywhere — always import the concrete path
(`@/lib/derive`, `@/lib/supabase/types`, etc.).

## Auth

Supabase email-OTP (magic code), not password-based:
`app/login/actions.ts` → `sendCode` (`auth.signInWithOtp`) and `verifyCode` (`auth.verifyOtp`, then
redirect to `/`), driven by `useActionState` in `login-form.tsx`'s 2-step (email → 6-digit code) UI.

**Root `proxy.ts`** is the actual gate (Next 16's `middleware.ts` replacement, see above): builds a
Supabase server client from request cookies, calls `auth.getUser()`, redirects anything unauthenticated
to `/login` unless the path is in `PUBLIC_PATHS = ["/login"]`; `config.matcher` excludes
`_next/static`, `_next/image`, favicon/manifest/icon assets.

Sign-out: `app/actions.ts` → `signOut()` server action, invoked via a plain `<form action={signOut}>`
from the Panel and Ajustes views.

Multi-tenancy: a Supabase "household" shared by exactly two people (the original design's
"Miguel"/"Mayté"), resolved per signed-in user through `household_members` in `getHousehold()`. Every
table is RLS-scoped to the caller's household via a `security definer is_member()` helper (per the
recovered schema below — RLS isn't visible from the app code, only from the DB).

## Domain model

**`SCHEMA.sql` at the repo root is the source of truth for the actual Postgres/Supabase DDL**
(tables, columns, types, defaults, FKs) — read it before writing any migration or query that depends
on exact column shape. It was restored from a live Supabase schema dump (the original file of the
same name, deleted in commit `b24496e` "Remove unused files", is still recoverable via
`git show 7feb950:design_handoff_shared_savings/design_handoff_shared_savings/SCHEMA.sql` if you ever
need the pre-deletion version/README for historical context, but `SCHEMA.sql` at the root is the
current one — don't confuse the two). The summary below is a working-memory digest of that file, not
a replacement for it — the two must stay in sync (see "Keeping this file current").

**Entities** (types in `lib/supabase/types.ts`):
- `Household { id, name, created_at }`
- `HouseholdMember { household_id, user_id, display_name, joined_at }`
- `Account { id, household_id, name, owner_user_id (nullable ⇒ joint/"Conjunta"), archived, sort_order, created_at }`
- `Category { id, household_id, name, color, archived, sort_order, created_at }` — color is editable
  after creation and is treated as part of the category metadata, not a one-time choice
- `Transaction { id, household_id, kind, amount_cents, occurred_on, account_id, to_account_id, category_id, note, created_by, created_at, updated_at }`
  - `kind: MovementKind = "expense" | "income" | "transfer"`
  - `amount_cents` is **always positive** — `kind` alone carries direction
  - `occurred_on` is a plain `YYYY-MM-DD` date string, not a timestamp — "a movement happens on a day,
    not at an instant"

**Shape rules per `kind`** (originally DB CHECK constraints; only app-enforced now that the schema
file is gone — be explicit about this if you ever rebuild real migrations):
- `expense` → must have `category_id`; must NOT have `to_account_id`
- `income` → must have neither `category_id` nor `to_account_id`
- `transfer` → must have `to_account_id` (≠ `account_id`); must NOT have `category_id`

**Aggregation rules** (`lib/derive.ts` — the part most likely to regress silently):
- `income(period) = Σ amount where kind = income`; `expense(period) = Σ amount where kind = expense`
- `balance(period) = income − expense` — **transfers never count** toward income/expense/balance
  anywhere (KPIs, donut, heat grid, filter-bar sum)
- `saldo(account)` (all-time) `= +income on it − expense on it − transfers where account_id = it + transfers where to_account_id = it`
- Owner/person scoping (`OwnerScope = "all" | "a" | "b" | "j"`): `"j"` = joint accounts
  (`owner_user_id === null`), `"a"`/`"b"` = each member's own accounts; a transfer counts as "in scope"
  if **either** side's account is in scope. Explicit non-goal: **no per-person spending comparison** —
  the person filter only scopes which accounts get summed, never "who spent more."
- Deletes: `Account`/`Category` are soft-deleted (`archived` boolean), and can only be archived while
  their usage count (`categoryUsageCount`/`accountUsageCount` in `lib/derive.ts`) is 0 (enforced by
  disabling the button in `ajustes-view.tsx`, not by a DB constraint). `Transaction` deletes are hard
  (`deleteTransaction` really deletes the row).

## Env / config

`.env.local` has exactly two vars, both client-exposed: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No service-role/server-only secret exists — server and browser
Supabase clients share the same public URL/key, differing only in cookie handling. No
`.env.example` in the repo.

## Conventions

- **Language split**: UI copy, route segment names (`ano`, `movimientos`, `ajustes`), and most code
  comments are **Spanish**; identifiers (variables/functions/types) are **English**. Keep this split
  when adding code.
- kebab-case filenames, PascalCase components, camelCase functions/vars, one exported component per
  file in `components/`.
- Server/client boundary is explicit and enforced by convention, not just folder location: files that
  must only run server-side declare `import "server-only"` (`lib/data.ts`, `lib/supabase/server.ts`);
  files meant for the browser say so structurally (`lib/mutations.ts`, `lib/supabase/client.ts`, every
  `components/*` file has `"use client"` at the top).
- Comments in `lib/*.ts` frequently explain **why**, often referencing the now-deleted SCHEMA.sql/README
  — preserve or update these comments rather than deleting them when you touch nearby code; they're
  the only remaining record of intent for several business rules.

## Keeping this file current

This file is only useful if it matches the repo. When a change you make affects something documented
above — a new route/page, a new top-level directory, a new dependency that changes the stack section,
a schema/entity/business-rule change, a new or broken convention, a new env var — **update the
relevant section of this SKILL.md in the same edit**, not as a follow-up. A small, accurate map beats
a stale, comprehensive one: if you're not sure whether a change is "material" enough, ask whether the
next person reading this file would be misled without the update — if yes, update it.

**Database structure changes specifically** (new/dropped/renamed table or column, new constraint,
new enum value on `kind`, a new RLS policy, anything that would make a `CREATE TABLE` differ from
what's on disk): update **both** `SCHEMA.sql` at the repo root (the DDL itself — keep it a plausible
`CREATE TABLE` dump even though it's "context only, not meant to be run") **and** the "Domain model"
section above (entities/shape rules/aggregation rules) in the same edit. `SCHEMA.sql` is what a human
would paste in from Supabase; the section above is the digest Claude actually reasons from — divergence
between them is exactly the staleness this file exists to prevent. This applies whether the change
originates from a migration you write, or from the user simply describing a schema change they made
in the Supabase dashboard.

Changes that do *not* need an update here: bug fixes that don't change structure/conventions, styling
tweaks within the existing CSS system, copy changes, dependency patch/minor bumps that don't add new
patterns.

# Handoff: Shared Savings Manager ("Ahorros")

## Overview

A private household finance app for two people (Miguel and Mayté) tracking savings across
several bank accounts — some personal to one of them, some joint. All data is entered
manually; there are no bank integrations. The app answers three questions:

1. What is the balance of this month, and where did the money go by category?
2. How does the year look, month by month and category by month?
3. Why was this month expensive? (notes attached to movements)

Explicit non-goal, requested by the product owner: **no per-person comparison of who spends
more**. The person filter scopes *which accounts* are being summed, never who is at fault.
Do not add "Miguel vs Mayté" charts or per-person expense splits.

Language: Spanish (es-ES). Currency: EUR, `es-ES` formatting (`1.257 €`, `−63,00 €`).

## About the Design Files

The files in this bundle are **design references written in HTML** — a working prototype of
the intended look and behavior, not production code to copy. `Ahorros.dc.html` runs on an
internal streaming-component runtime (`support.js`); do not port that runtime.

The task is to **recreate these screens in the target codebase** using its own framework and
conventions. The product owner's plan is **Next.js (App Router) + Supabase** (auth, Postgres,
RLS) deployed on Vercel; `SCHEMA.sql` in this folder is the proposed database, including row
level security. If a codebase already exists, follow its patterns instead of the ones here.

The prototype persists to `localStorage` and ships with generated sample data for Jan–Aug
2026. Both are prototype scaffolding — replace with Supabase reads/writes; do not port the
seed generator.

## Fidelity

**High fidelity.** Colors, typography, spacing, radii, shadows and copy are final and should
be reproduced closely. Open `Ahorros.dc.html` in a browser to see it live and read exact
values off the elements. Layout is responsive by intrinsic CSS only (`auto-fit` grids,
`flex-wrap`) — there are no media queries, and the same tree serves phone and desktop.

---

## Screens / Views

Four views behind a top tab bar, plus one modal sheet. All four are always reachable; there
is no routing state beyond "which tab".

### Global chrome (all views)

**Background** — fixed, non-scrolling, behind everything (`z-index:0`, `pointer-events:none`):
solid `#eceaea`, plus three fixed radial-gradient blobs that the glass surfaces blur:

| blob | position | size | gradient |
| --- | --- | --- | --- |
| red | `top:-180px; left:-120px` | 620×620 | `radial-gradient(circle at 50% 50%, rgba(236,48,19,.34), rgba(236,48,19,0) 68%)` |
| ink | `bottom:-220px; right:-140px` | 680×680 | `radial-gradient(circle at 50% 50%, rgba(32,30,29,.30), rgba(32,30,29,0) 68%)` |
| salmon | `top:38%; left:52%` | 460×460 | `radial-gradient(circle at 50% 50%, rgba(255,151,131,.30), rgba(255,151,131,0) 70%)` |

**Header** — `position:sticky; top:0; z-index:20`, `background:rgba(255,255,255,.52)`,
`backdrop-filter:blur(22px) saturate(1.5)`, `border-bottom:2px solid rgba(32,30,29,.28)`.
Inner column `max-width:1240px; margin:0 auto; padding:14px 20px`, `display:flex; flex-wrap:wrap;
gap:14px 24px`.

- Brand: 14×14 square, `border-radius:5px`, `background:#ec3013`; then "Ahorros" (800, 19px,
  `letter-spacing:-.02em`); then "CUENTAS COMPARTIDAS" (11px, 600, `letter-spacing:.12em`,
  uppercase, `rgba(32,30,29,.5)`). The group takes `margin-right:auto`.
- **Person filter** — pill group: container `padding:4px; gap:3px; border-radius:999px;
  background:rgba(255,255,255,.55); border:1px solid rgba(255,255,255,.85)`. Four buttons —
  `Todo`, `Miguel`, `Mayté`, `Conjunta` — each `border-radius:999px; padding:8px 16px;
  min-height:38px; font-weight:600; font-size:13px`. Selected: `background:#201e1d;
  color:#f8f4f4`. Unselected: transparent, `color:rgba(32,30,29,.7)`.
- **Tab bar** — second row, same 1240px column, `display:flex; gap:26px; overflow-x:auto`.
  Tabs: `Panel`, `Año`, `Movimientos`, `Categorías y cuentas`. 14px/700, `padding:12px 0;
  min-height:44px`. Active: `color:#201e1d` + `border-bottom:3px solid #ec3013`. Inactive:
  `color:rgba(32,30,29,.55)`, transparent bottom border.

**Content column** — `max-width:1240px; margin:0 auto; padding:26px 20px 130px` (the deep
bottom padding keeps the last card clear of the floating button).

**Floating add button (FAB)** — `position:fixed; bottom:22px; right:22px; z-index:30`,
58×58, `border-radius:50%`, `background:#ec3013`, `color:#f8f4f4`, glyph `+` at 28px,
`border:1px solid rgba(255,255,255,.45)`, `box-shadow:0 14px 38px rgba(236,48,19,.45)`.
Opens the movement sheet in "new" mode. Present in every view.

**The glass card** (the repeated surface, used unless stated otherwise):
`padding:20–22px; border-radius:20px; background:rgba(255,255,255,.5);
backdrop-filter:blur(20px) saturate(1.4); border:1px solid rgba(255,255,255,.85);
box-shadow:0 10px 34px rgba(32,30,29,.10)`.

**The kicker** (every card's label): 11px, 700, `letter-spacing:.12em`, uppercase,
`color:rgba(32,30,29,.5)`.

---

### 1. Panel (monthly dashboard) — default view

**Purpose**: the month at a glance — balance, where the money went, and why.

**Month stepper**: row, `flex-wrap:wrap; gap:12px`. Left group is `‹` button, label, `›`
button with `gap:8px`. Buttons 44×44, `border-radius:14px; border:1px solid rgba(32,30,29,.28);
background:rgba(255,255,255,.55)`, glyph 18px. The label ("Agosto 2026") is 28px/800,
`letter-spacing:-.025em`, **fixed `width:250px; text-align:center`** — it must stay optically
centered between the two arrows as the month name changes length. On the right of the row,
`margin-left:auto`: the scope label, 12px/600 uppercase `letter-spacing:.1em`
`rgba(32,30,29,.5)` — "Todas las cuentas" or "Cuentas de Miguel" / "de Mayté" / "de conjunta".

**KPI row**: `display:grid; grid-template-columns:repeat(auto-fit,minmax(178px,1fr)); gap:16px`.
Four cards, each with kicker + a 32px/800 figure at `letter-spacing:-.03em; line-height:1`:

1. *Balance del mes* — glass card. Figure `#0f6b3f` when ≥ 0, `#ae1800` when negative.
   Value is signed (`+`/`−`, rounded to whole euros).
2. *Ingresos* — **solid** `background:#e3efe8; border:1px solid #c2dbcd`, kicker `#3d7a5c`,
   figure `#0f6b3f`. (Deliberately not translucent — glass over the colored background read
   muddy and was rejected.)
3. *Gastos* — **solid** `background:#f7e3de; border:1px solid #eec7bd`, kicker `#a3503c`,
   figure `#ae1800`.
4. *Ahorrado en {year}* — **filled** card, `color:#f8f4f4`, kicker at `opacity:.85`.
   `background:#17804d` and `box-shadow:0 10px 34px rgba(23,128,77,.28)` when the
   year-to-date-through-this-month sum is ≥ 0; `#ec3013` /
   `0 10px 34px rgba(236,48,19,.28)` when negative.

**Charts row**: `grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:16px`.

- *Gasto por categoría* (glass): a 210×210 donut, `border-radius:50%`,
  `box-shadow:0 12px 30px rgba(32,30,29,.16)`, filled with a `conic-gradient` of hard stops —
  one stop per category with expenses this month, in descending amount order, each
  `<color> <from>% <to>%`. Empty month: `conic-gradient(rgba(32,30,29,.14) 0 100%)`.
  The hole is an absolutely positioned `inset:29%` circle, `background:rgba(255,255,255,.72)`,
  `backdrop-filter:blur(8px)`, containing "TOTAL" (10px/700 uppercase `.1em`) over the month's
  expense total (20px/800).
- *Ranking* (glass): one row per category with expenses, descending. Row is a two-column grid
  (`1fr auto`, `gap:4px 12px`): color chip 11×11 `border-radius:4px` + name (14px/600, ellipsis)
  on the left, amount (14px/800, `font-variant-numeric:tabular-nums`) on the right; then a
  full-width sub-row (`grid-column:1 / -1`) with a 7px `border-radius:999px` track
  `rgba(32,30,29,.12)` whose fill is the category color at `width = amount / largest category`,
  and the share of total (`11px/600 rgba(32,30,29,.55)`) to its right. Rows `gap:11px`.
  Empty state: "Sin gastos registrados este mes."

**Notas del mes** (glass): the "why was this month expensive" panel. Header is a full-width
button (`display:flex; gap:12px; align-items:center`): kicker "NOTAS DEL MES", then a count
badge (11px/800, `color:#ae1800; background:#f7e3de; border-radius:999px; padding:4px 10px`),
then "Ocultar"/"Ver" pushed right (13px/700 `rgba(32,30,29,.55)`). Open by default; the toggle
collapses the body. Body lists every movement of the month that has a note, **sorted by amount
descending**: two-column grid, `border-top:1px solid rgba(32,30,29,.14)`, `padding:11px 0` —
color chip + label (14px/700: category name, or "Ingreso", or "Traspaso") + date (12px/600
muted) on the left, amount on the right; the note itself on a full-width second line
(14px, `rgba(32,30,29,.72)`, `text-wrap:pretty`, `padding-left:17px`). Empty state: "Ningún
movimiento de este mes tiene nota. Escribe una al añadir un gasto y aparecerá aquí."

**Últimos movimientos** (glass): the 8 most recent movements of the month, newest first.
Row grid `56px 1fr auto`, `gap:14px`, `padding:11px 0`, `border-bottom:1px solid
rgba(32,30,29,.14)`. Date as "24 ago" (12px/700 muted, tabular). Middle: chip 9×9 +
label (14px/600, ellipsis) and, under it, `sub` (11px/500 muted, `padding-left:17px`) =
`account · owner` for income/expense (plus `· note` when an expense has one), or
`from → to` for transfers. Amount 15px/800 tabular, formatted with 2 decimals.

### 2. Año (yearly overview)

**Purpose**: the shape of the year and which category ate which month.

Year stepper identical to the month stepper (same 44px arrow buttons, same fixed 250px
centered label showing e.g. "2026", same scope label right).

**KPI row** (same `auto-fit,minmax(178px,1fr)` grid, figures 30px/800):
1. *Balance del año* — filled green `#17804d` / red `#ec3013` card, white text, same rule and
   shadows as the panel's fourth card, driven by the year's income − expense.
2. *Ingresos* — solid `#e3efe8` card.
3. *Gastos* — solid `#f7e3de` card.
4. *Media mensual ahorrada* — glass; figure `#0f6b3f` / `#ae1800` by sign. Divides the year's
   balance by the number of months that have any movement (never by 12).

**Ingresos y gastos por mes** (glass): header row with the kicker (`margin-right:auto`) then a
legend — 11×11 `border-radius:4px` `#1f9c5d` + "Ingresos" (12px/600 `#0f6b3f`), 11×11 `#ec3013`
+ "Gastos" (12px/600 `#ae1800`) — then "la cifra de arriba es el balance" (12px/600 muted).
Body: `display:flex; gap:6px; overflow-x:auto`. One column per month, `flex:1 0 64px`,
`cursor:pointer`, `gap:6px`:

- Balance figure on top: 11px/800 tabular, centered, signed; `#0f6b3f` if ≥ 0, `#ae1800` if
  negative, `rgba(32,30,29,.35)` and rendered as `—` for a month with no movements.
- Track: `height:150px; border-radius:10px; background:rgba(32,30,29,.06); padding:4px;
  display:flex; align-items:flex-end; gap:3px` holding two `flex:1` bars,
  `border-radius:7px` — income `#1f9c5d`, expense `#ec3013`. Heights are a percentage of the
  **largest single income or expense across the year** (shared scale, so months compare).
  `min-height:3px` **only when the value is > 0** — empty months must draw nothing.
- Month chip: `MSHORT` uppercase (11px/700, `letter-spacing:.06em`), `border-radius:8px;
  padding:3px 0`, `background:#e3efe8` + `color:#0f6b3f` for a positive month, `#f7e3de` +
  `#ae1800` for negative, transparent + `rgba(32,30,29,.45)` for empty.
- Clicking a column jumps to the Panel for that month.

**Categorías × meses** heat grid (glass): kicker + "más rojo, más gasto" (11px/500
`rgba(32,30,29,.45)`). `overflow-x:auto` around a `min-width:760px` block. Header and body rows
are both `display:grid; grid-template-columns:150px repeat(12,1fr) 96px; gap:4px`. Header: blank
cell, twelve month abbreviations (10px/700 uppercase `.06em` muted, centered), "Total"
right-aligned. Each body row: chip 9×9 + category name (13px/600, ellipsis); twelve cells
`height:34px; border-radius:9px`, centered 10px/700 tabular text showing the rounded amount
(empty string when zero); the row total right-aligned 13px/800. Cell fill is
`rgba(236,48,19, 0.10 + 0.82 × amount/maxCellInYear)`, with text `#fff2ef` when that ratio
exceeds .55, else `#201e1d`; zero cells are `rgba(32,30,29,.05)`. Every cell carries a
`title` of "Category · Month: €amount".

### 3. Movimientos (transaction list)

**Purpose**: find, correct or delete anything.

Title "Movimientos" 28px/800. **Filter bar**: glass-ish strip, `padding:14px;
border-radius:18px; background:rgba(255,255,255,.5); backdrop-filter:blur(20px);
border:1px solid rgba(255,255,255,.85)`, `display:flex; flex-wrap:wrap; gap:10px`. Controls all
`min-height:44px; border-radius:12px; border:1px solid rgba(32,30,29,.28);
background:rgba(255,255,255,.7); font-size:14px`:

- type select — Todo / Solo gastos / Solo ingresos / Solo traspasos
- category select — "Todas las categorías" + every category
- month select — "Todos los meses" + every month that has data, newest first, "Agosto 2026"
- note search input (`flex:1 1 180px`), placeholder "Buscar nota…", matches note **or** label
- a live summary, 13px/700 muted: `{n} mov. · {signed sum}` (transfers contribute 0)

**List**: one rounded container (`border-radius:20px; overflow:hidden`) of rows, grid
`88px 1fr auto auto`, `gap:14px; padding:13px 18px`, `border-bottom:1px solid
rgba(32,30,29,.14)`. Date "24 ago 26". Middle block as in Últimos movimientos. Amount 15px/800.
Then two 38×38 buttons, `border-radius:12px; border:1px solid rgba(32,30,29,.24);
background:rgba(255,255,255,.6)` — `✎` opens the sheet on that movement, `×` deletes it
immediately (`color:#ae1800`). Capped at 300 rendered rows. Empty state: "Ningún movimiento con
estos filtros."

### 4. Categorías y cuentas

`grid-template-columns:repeat(auto-fit,minmax(330px,1fr)); gap:16px`, two glass cards.

**Categorías** — title 23px/800, help line "Elige el color al crearla. Solo se pueden borrar
las que no tengan movimientos." (13px muted). Create row: a `<input type="color">`
(52×44, `border-radius:12px`) **to the left of** the name input (`flex:1`, placeholder "Nueva
categoría", Enter submits) and a red `Añadir` button (`background:#ec3013; color:#f3f2f2;
border-radius:12px; padding:0 18px; min-height:44px`). The color is chosen **at creation**;
existing rows show it as a static 16×16 `border-radius:6px` swatch and are not recolorable.
Each row: `grid-template-columns:16px 1fr auto auto; gap:12px; padding:9px 0`, bottom rule —
swatch, name in an inline-editable input (`min-height:40px; border-radius:12px;
background:rgba(255,255,255,.45); border:1px solid transparent; 14px/600`), usage count
("4 mov.", 12px/700 muted, right-aligned), and a 38×38 `×` delete that is **disabled at
`opacity:.35` whenever the category has movements**.

**Cuentas** — same card grammar. Help line "Cambia el nombre o el titular. Solo se borran las
cuentas sin movimientos." Create row: name input + owner select (Miguel / Mayté / Conjunta) +
`Añadir`. Each account row is two lines: name (inline-editable, 15px/700) with its **saldo**
(15px/800 tabular) right-aligned, then a second line with the owner select
(`min-height:38px`), the usage count (12px/600 muted, `margin-right:auto`) and the disabled-when-
used `×`. Saldo = all-time sum over that account: `+income`, `−expense`, `−transfer out`,
`+transfer in`.

Footer of the accounts card: `border-top:2px solid rgba(32,30,29,.28)`, the line "Los datos se
guardan en este navegador." and a secondary `Borrar todos los datos` button. **Both are
prototype-only** — in production replace with real account/session settings.

### 5. Movement sheet (add / edit)

A **bottom sheet**, not a centered modal — the product owner asked for a slide-up panel.

- Veil: `position:fixed; inset:0; z-index:50; background:rgba(32,30,29,.42)`,
  `animation:veil-in .18s ease-out both`, `display:flex; align-items:flex-end;
  justify-content:center`. Clicking the veil closes; clicks inside the sheet must not bubble.
- Sheet: `width:100%; max-width:560px; max-height:92vh; overflow-y:auto;
  overscroll-behavior:contain; border-radius:26px 26px 0 0; background:#f6f4f4;
  border:1px solid rgba(255,255,255,.9); box-shadow:0 -18px 60px rgba(32,30,29,.34);
  padding:0 24px 26px`. Entrance `animation:sheet-up .26s cubic-bezier(.22,.9,.24,1) both`
  (`@keyframes sheet-up { from { transform: translateY(100%) } to { transform: translateY(0) } }`).
- **Grab handle**: sticky top strip (`background:#f6f4f4; padding:14px 0 12px;
  touch-action:none; cursor:grab`) centering a 44×5 `border-radius:999px`
  `rgba(32,30,29,.28)` bar. **Drag-to-dismiss**: pointer-down on the handle captures the
  pointer; downward movement translates the sheet by the drag delta (never upward); release
  past **120px** closes it, otherwise it springs back to 0. While dragging, the CSS entrance
  animation must be switched off, or its `fill-mode: both` will override the drag transform.
- Title 22px/800 ("Nuevo movimiento" / "Editar movimiento"), with a 42×42 `×` close at the
  right (`border-radius:14px`).
- **Kind switch**: `grid-template-columns:repeat(3,1fr); gap:8px`, buttons 14px/800,
  `min-height:46px; border-radius:14px; border:1px solid rgba(32,30,29,.24)`. Inactive:
  `background:#ffffff; color:rgba(32,30,29,.6)`. Active — *Gasto* `#ec3013`, *Ingreso*
  `#17804d`, *Traspaso* `#201e1d`, all with `color:#f8f4f4`.
- Fields, stacked `gap:14px`, each a label (11px/700 uppercase `.12em`
  `rgba(32,30,29,.55)`) over its control (`border-radius:14px; border:1px solid
  rgba(32,30,29,.28); background:rgba(255,255,255,.75); min-height:48px`):
  - **Importe (€)** — bigger: `min-height:54px; border-radius:16px; font-size:24px;
    font-weight:800`, `inputmode="decimal"`, placeholder "0,00". Accepts comma or dot.
  - **Fecha** — native date input, defaults to today.
  - **Cuenta** — relabels to **Desde** for a transfer. Options read "Sabadell — Miguel".
  - **Hacia** — transfers only; plus the note "Los traspasos no cuentan como gasto ni como
    ingreso: solo mueven saldo entre cuentas." (12px muted).
  - **Categoría** — expenses only.
  - **Nota** — always, placeholder "Opcional". This is what feeds *Notas del mes*.
- Actions, `margin-top:24px; gap:8px`: `Guardar` (`flex:1`, `#ec3013`, `color:#f3f2f2`,
  `min-height:52px; border-radius:16px; box-shadow:0 8px 26px rgba(236,48,19,.34)`) and a
  secondary `Cancelar`.
- On save the app jumps the Panel to the month of the saved date.

---

## Interactions & Behavior

- **Person filter** scopes every figure in Panel, Año and Movimientos to the accounts of that
  person (`Conjunta` = the joint accounts). A transfer is in scope if **either** side of it is.
  Categories/cuentas admin is not scoped.
- **Validation**: amount must parse (comma or dot) and be > 0, otherwise the save is a no-op.
  A transfer needs two different accounts. Amounts are always stored positive; the kind carries
  the sign.
- **Transfers never affect income, expense or balance** anywhere — not in the KPIs, not in the
  donut, not in the heat grid, not in the filter-bar sum. They only move an account's saldo.
  This is the single easiest thing to get wrong.
- **Deletes**: a movement deletes immediately from its row. A category or account can only be
  deleted while nothing references it (button disabled at `opacity:.35` otherwise). In
  production prefer an `archived` flag over a hard delete so history keeps its labels.
- **Animations**: only the sheet — `veil-in .18s ease-out`, `sheet-up .26s
  cubic-bezier(.22,.9,.24,1)`, and the drag transform. Nothing else animates.
- **Responsive**: no media queries. The KPI grid is `auto-fit minmax(178px,1fr)`, the chart and
  admin grids `minmax(320px/330px,1fr)`; the header rows and filter bar wrap; the year chart and
  heat grid scroll horizontally. Every interactive control is ≥ 44px tall (38px for the small
  row-level icon buttons and the pill filter, which sit inside 44px rows).
- **Focus**: keep a visible ring — the design system's is `2px solid #ec3013` at
  `outline-offset:2px`. Do not ship browser-default blue.

## State Management

Prototype state, and what it becomes in production:

| Prototype state | Production |
| --- | --- |
| `cats`, `accounts`, `tx` | Supabase tables, fetched per household |
| `view` | route segment (`/`, `/ano`, `/movimientos`, `/ajustes`) |
| `owner` (`all`/`a`/`b`/`j`) | client filter state; `a`/`b` map to user ids, `j` to `owner_user_id is null` |
| `y`, `m` / `year` | URL search params so a month is linkable |
| `form` (`{id,type,amount,date,account,accountTo,cat,note}`) | sheet form state; `null` = closed |
| `drag`, `dragged` | sheet gesture state |
| `fType`, `fCat`, `fMonth`, `fQuery` | list filters (URL params are nice here too) |
| `notesOpen` | local UI state |
| `newCat`, `newCatColor`, `newAccName`, `newAccOwner` | create-row form state |

**Data fetching**: fetch a whole year of movements in one query and derive every figure client
side — the prototype's `renderVals()` is a working spec of those derivations (month totals,
category ranking, donut stops, the shared bar scale, the heat matrix, saldos). At this data
volume (1–3k rows/year) do not build aggregation endpoints or SQL views.

**Writes**: optimistic insert/update on save, reconcile on response — manual entry has to feel
instant. Rounding: store integer cents; only format at the edge.

## Design Tokens

The design system is **Modernist** (`_ds/modernist-…/styles.css` in this bundle) — Archivo,
red `#ec3013` on a light ground, flat, normally radius 0. This app deliberately departs on two
points at the owner's request: **rounded corners** and **glassmorphic surfaces**, plus a green
for positives that the mono system doesn't carry. Everything else (type, red, ink, spacing
rhythm) comes from the system.

**Color**

| Token | Value | Use |
| --- | --- | --- |
| ground | `#eceaea` | page behind the blobs |
| ink | `#201e1d` | text, neutral bars, active pill/tab |
| ink muted | `rgba(32,30,29,.5)` / `.55` | kickers, secondary text |
| rules | `rgba(32,30,29,.14)` rows / `rgba(32,30,29,.28)` strong | dividers, control borders |
| accent red | `#ec3013` | FAB, primary buttons, expense bars, heat scale, active tab |
| red deep | `#ae1800` | expense figures, destructive glyphs |
| red tint / border / label | `#f7e3de` / `#eec7bd` / `#a3503c` | Gastos card, negative chips |
| green fill | `#17804d` | filled positive balance card, active *Ingreso* |
| green bar | `#1f9c5d` | income bars, legend chip |
| green deep | `#0f6b3f` | income & positive figures |
| green tint / border / label | `#e3efe8` / `#c2dbcd` / `#3d7a5c` | Ingresos card, positive chips |
| glass | `rgba(255,255,255,.5)` + `blur(20px) saturate(1.4)` + `1px rgba(255,255,255,.85)` | cards |
| sheet | `#f6f4f4` | bottom sheet (solid on purpose) |
| category palette | `#ec3013 #201e1d #ae1800 #7d7979 #ff563c #444141 #ff9783 #9b9797 #4d170e #c94b39 #bab6b6` | assigned in order on create, then stored per category |

**Type** — Archivo 400/500/600/800 (weights 400, 500, 600, 700, 800 in use).
Figures 30–34px/800 `letter-spacing:-.03em`; view titles 28px/800 `-.025em`; card titles
23px/800; body 13–15px; kickers 11px/700 uppercase `.12em`; micro labels 10–12px.
Numbers always `font-variant-numeric:tabular-nums`.

**Spacing** — 4 / 8 / 12 / 14 / 16 / 20 / 22 / 26 px; grid gaps 16px between cards, 6–8px
inside groups.

**Radius** — cards 20px, filter strip 18px, sheet 26px top corners, amount field 16px,
controls 12–14px, arrow buttons 14px, chips/tracks 8–10px, pills & tracks 999px, FAB 50%.

**Shadow** — cards `0 10px 34px rgba(32,30,29,.10)`; donut `0 12px 30px rgba(32,30,29,.16)`;
FAB `0 14px 38px rgba(236,48,19,.45)`; primary button `0 8px 26px rgba(236,48,19,.34)`;
colored KPI card `0 10px 34px rgba(23,128,77,.28)` / `rgba(236,48,19,.28)`; sheet
`0 -18px 60px rgba(32,30,29,.34)`.

**Formatting** — `Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',
maximumFractionDigits:0, useGrouping:true})` for headline figures (`1.257 €` — `useGrouping:true`
is required, the default suppresses grouping on 4-digit numbers) and the same with
`minimumFractionDigits:2` for row amounts. Signed figures prefix `+` for positives; expense rows
use the typographic minus `−`.

**Copy** — Spanish, lowercase-plain, no exclamation marks. Initial categories, verbatim:
La compra, Energía, Transporte, Bares y más, Suscripciones, Capricho, Regalos, Cosas de casa,
Ropa, Gatetes, Otros. Accounts: Sabadell (Miguel), Ruralvia (Miguel), Santander (Mayté),
Revolut (Conjunta).

## Assets

None. No images, no icon files — the few glyphs are text characters (`‹ › × ✎ + →`) and every
shape is CSS. If you want real icons, the design system specifies **Lucide**; `chevron-left`,
`chevron-right`, `x`, `pencil`, `plus`, `arrow-right` cover it.

## Files

- `Ahorros.dc.html` — the full prototype (template + logic). Open it in a browser.
- `support.js` — the prototype runtime. **Reference only, do not port.**
- `_ds/modernist-6d10fe40-4218-481f-a45c-229a90df1a4a/styles.css` — design-system tokens
  and components (the source of truth for Archivo, the red, ink, spacing and focus ring).
- `_ds/modernist-6d10fe40-4218-481f-a45c-229a90df1a4a/_ds_bundle.js` — its component bundle.
- `SCHEMA.sql` — proposed Postgres schema, indexes and RLS policies for Supabase.
- `screenshots/` — reference captures at ~1180px wide: `01-panel.png`,
  `02-ano.png`, `03-movimientos.png`, `04-categorias-cuentas.png`,
  `05-hoja-movimiento.png` (the bottom sheet open over the Panel).

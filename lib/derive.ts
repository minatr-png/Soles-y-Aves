// Derivaciones puras compartidas por Panel, Año y Movimientos. Todo se
// calcula en cliente a partir del año completo de movimientos ya traído
// (ver SCHEMA.sql, sección "reading", para las reglas de agregación).

import type { Account, Category, HouseholdMember, Transaction } from "@/lib/supabase/types";

export type OwnerScope = "all" | "a" | "b" | "j";

// null = sin restricción (todas las cuentas están en alcance).
export function scopedAccountIds(
  accounts: Account[],
  members: HouseholdMember[],
  scope: OwnerScope,
): Set<string> | null {
  if (scope === "all") return null;
  if (scope === "j") {
    return new Set(accounts.filter((a) => a.owner_user_id === null).map((a) => a.id));
  }
  const member = scope === "a" ? members[0] : members[1];
  if (!member) return new Set();
  return new Set(accounts.filter((a) => a.owner_user_id === member.user_id).map((a) => a.id));
}

// Un traspaso está en alcance si CUALQUIERA de sus dos cuentas lo está.
export function isTransactionInScope(tx: Transaction, scopeIds: Set<string> | null): boolean {
  if (scopeIds === null) return true;
  if (tx.kind === "transfer") {
    return scopeIds.has(tx.account_id) || (tx.to_account_id !== null && scopeIds.has(tx.to_account_id));
  }
  return scopeIds.has(tx.account_id);
}

export function isInMonth(tx: Transaction, year: number, month: number): boolean {
  return tx.occurred_on.startsWith(`${year}-${String(month).padStart(2, "0")}`);
}

// Desde enero de `year` hasta el final de `month`, inclusive.
export function isThroughMonth(tx: Transaction, year: number, month: number): boolean {
  if (!tx.occurred_on.startsWith(`${year}-`)) return false;
  const txMonth = Number(tx.occurred_on.slice(5, 7));
  return txMonth <= month;
}

export function sumByKind(txs: Transaction[], kind: "income" | "expense"): number {
  return txs.filter((t) => t.kind === kind).reduce((sum, t) => sum + t.amount_cents, 0);
}

// income - expense; los traspasos no cuentan nunca.
export function balanceOf(txs: Transaction[]): number {
  return sumByKind(txs, "income") - sumByKind(txs, "expense");
}

// Saldo total en las cuentas en alcance, aplicando saldo(account) de
// SCHEMA.sql sobre TODO el histórico (no solo el año visible). Con
// scopeIds === null (todas las cuentas) los traspasos se cancelan entre sí.
export function totalBalance(txs: Transaction[], scopeIds: Set<string> | null): number {
  let total = 0;
  for (const t of txs) {
    const fromInScope = scopeIds === null || scopeIds.has(t.account_id);
    if (t.kind === "income") {
      if (fromInScope) total += t.amount_cents;
    } else if (t.kind === "expense") {
      if (fromInScope) total -= t.amount_cents;
    } else {
      const toInScope = scopeIds === null || (t.to_account_id !== null && scopeIds.has(t.to_account_id));
      if (fromInScope) total -= t.amount_cents;
      if (toInScope) total += t.amount_cents;
    }
  }
  return total;
}

export type CategoryTotal = { category: Category; totalCents: number };

export function categoryTotals(expenseTxs: Transaction[], categories: Category[]): CategoryTotal[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();
  for (const t of expenseTxs) {
    if (t.kind !== "expense" || !t.category_id) continue;
    totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + t.amount_cents);
  }
  return [...totals.entries()]
    .map(([categoryId, totalCents]) => ({ category: byId.get(categoryId), totalCents }))
    .filter((entry): entry is CategoryTotal => Boolean(entry.category))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export type MonthTotal = {
  month: number; // 1-12
  income: number;
  expense: number;
  balance: number;
  // hay algún movimiento (de cualquier tipo, incluidos traspasos) ese mes.
  hasData: boolean;
};

// Un total por mes del año, para el gráfico de barras de Año.
export function monthlyTotals(txs: Transaction[], year: number): MonthTotal[] {
  const totals: MonthTotal[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expense: 0,
    balance: 0,
    hasData: false,
  }));
  for (const t of txs) {
    if (!t.occurred_on.startsWith(`${year}-`)) continue;
    const entry = totals[Number(t.occurred_on.slice(5, 7)) - 1];
    entry.hasData = true;
    if (t.kind === "income") entry.income += t.amount_cents;
    else if (t.kind === "expense") entry.expense += t.amount_cents;
  }
  for (const entry of totals) entry.balance = entry.income - entry.expense;
  return totals;
}

export type CategoryMonthRow = {
  category: Category;
  monthly: number[]; // 12 entradas, gasto en céntimos
  total: number;
};

// Una fila por categoría (en su orden de sort_order, incluidas las que no
// tuvieron gasto ningún mes) para la rejilla Categorías × meses de Año.
export function categoryMonthlyTotals(
  expenseTxs: Transaction[],
  categories: Category[],
  year: number,
): CategoryMonthRow[] {
  const monthlyById = new Map<string, number[]>();
  for (const t of expenseTxs) {
    if (t.kind !== "expense" || !t.category_id) continue;
    if (!t.occurred_on.startsWith(`${year}-`)) continue;
    const monthly = monthlyById.get(t.category_id) ?? Array(12).fill(0);
    monthly[Number(t.occurred_on.slice(5, 7)) - 1] += t.amount_cents;
    monthlyById.set(t.category_id, monthly);
  }
  return categories.map((category) => {
    const monthly = monthlyById.get(category.id) ?? Array(12).fill(0);
    return { category, monthly, total: monthly.reduce((a, b) => a + b, 0) };
  });
}

export const MONTHS_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const MONTHS_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic",
];

export function parseOccurredOn(occurredOn: string): { year: number; month: number; day: number } {
  const [year, month, day] = occurredOn.split("-").map(Number);
  return { year, month, day };
}

// "24 ago"
export function formatShortDate(occurredOn: string): string {
  const { month, day } = parseOccurredOn(occurredOn);
  return `${day} ${MONTHS_SHORT[month - 1]}`;
}

// "24 ago 26"
export function formatShortDateWithYear(occurredOn: string): string {
  const { year, month, day } = parseOccurredOn(occurredOn);
  return `${day} ${MONTHS_SHORT[month - 1]} ${String(year).slice(-2)}`;
}

// "YYYY-MM", usado para agrupar/filtrar movimientos por mes.
export function monthKey(occurredOn: string): string {
  return occurredOn.slice(0, 7);
}

// "Agosto 2026" a partir de una monthKey.
export function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS_FULL[month - 1]} ${year}`;
}

export function ownerLabel(account: Account | undefined, members: HouseholdMember[]): string {
  if (!account) return "";
  if (account.owner_user_id === null) return "Conjunta";
  return members.find((m) => m.user_id === account.owner_user_id)?.display_name ?? "Miembro";
}

export function movementLabel(tx: Transaction, categories: Category[]): string {
  if (tx.kind === "income") return "Ingreso";
  if (tx.kind === "transfer") return "Traspaso";
  return categories.find((c) => c.id === tx.category_id)?.name ?? "Gasto";
}

export function movementColor(tx: Transaction, categories: Category[]): string {
  if (tx.kind === "income") return "#1f9c5d";
  if (tx.kind === "transfer") return "#201e1d";
  return categories.find((c) => c.id === tx.category_id)?.color ?? "#7d7979";
}

export function movementSub(tx: Transaction, accounts: Account[], members: HouseholdMember[]): string {
  if (tx.kind === "transfer") {
    const from = accounts.find((a) => a.id === tx.account_id)?.name ?? "?";
    const to = accounts.find((a) => a.id === tx.to_account_id)?.name ?? "?";
    return `${from} → ${to}`;
  }
  const account = accounts.find((a) => a.id === tx.account_id);
  const base = `${account?.name ?? "?"} · ${ownerLabel(account, members)}`;
  return tx.kind === "expense" && tx.note ? `${base} · ${tx.note}` : base;
}

// Movimientos que referencian esta categoría/cuenta — una categoría o cuenta
// solo se puede borrar (archivar) cuando este recuento es 0.
export function categoryUsageCount(categoryId: string, txs: Transaction[]): number {
  return txs.filter((t) => t.category_id === categoryId).length;
}

export function accountUsageCount(accountId: string, txs: Transaction[]): number {
  return txs.filter((t) => t.account_id === accountId || t.to_account_id === accountId).length;
}

// saldo(account) de SCHEMA.sql: histórico completo, no solo el año visible.
export function accountBalance(accountId: string, txs: Transaction[]): number {
  let total = 0;
  for (const t of txs) {
    if (t.kind === "income") {
      if (t.account_id === accountId) total += t.amount_cents;
    } else if (t.kind === "expense") {
      if (t.account_id === accountId) total -= t.amount_cents;
    } else {
      if (t.account_id === accountId) total -= t.amount_cents;
      if (t.to_account_id === accountId) total += t.amount_cents;
    }
  }
  return total;
}

export function buildDonutGradient(totals: CategoryTotal[], totalCents: number): string {
  if (totalCents <= 0 || totals.length === 0) {
    return "conic-gradient(rgba(32,30,29,.14) 0 100%)";
  }
  let acc = 0;
  const stops = totals.map(({ category, totalCents: amount }) => {
    const from = acc;
    acc += (amount / totalCents) * 100;
    return `${category.color} ${from}% ${acc}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

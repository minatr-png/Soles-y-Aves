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

export function ownerLabel(account: Account | undefined, members: HouseholdMember[]): string {
  if (!account) return "";
  if (account.owner_user_id === null) return "Conjunta";
  return members.find((m) => m.user_id === account.owner_user_id)?.display_name ?? "Miembro";
}

export function scopeLabel(scope: OwnerScope, members: HouseholdMember[]): string {
  if (scope === "all") return "Todas las cuentas";
  if (scope === "j") return "Cuentas de conjunta";
  const member = scope === "a" ? members[0] : members[1];
  return `Cuentas de ${member?.display_name ?? "—"}`;
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

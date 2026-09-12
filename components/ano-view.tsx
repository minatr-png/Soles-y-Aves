"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Account, Category, HouseholdMember, Transaction } from "@/lib/supabase/types";
import { money, money2, signed } from "@/lib/format";
import { BlurredAmount, isBlurredCategoryId } from "@/components/blurred-amount";
import {
  MONTHS_FULL,
  MONTHS_SHORT,
  categoryMonthlyTotals,
  isTransactionInScope,
  monthlyTotals,
  scopedAccountIds,
  type OwnerScope,
} from "@/lib/derive";

type Props = {
  year: number;
  members: HouseholdMember[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
};

function scopeLabel(scope: OwnerScope, members: HouseholdMember[]): string {
  if (scope === "all") return "Todas las cuentas";
  if (scope === "j") return "Cuentas de conjunta";
  const member = scope === "a" ? members[0] : members[1];
  return `Cuentas de ${member?.display_name ?? "Miembro"}`;
}

export function AnoView({ year, members, accounts, categories, transactions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ownerScope = (searchParams.get("owner") as OwnerScope | null) ?? "all";

  // Marks the target year active immediately so repeated clicks accumulate
  // instead of each one computing from the same stale `year` prop while the
  // navigation is still in flight. Reset during render once the URL catches
  // up to the click.
  const [prevYear, setPrevYear] = useState(year);
  const [pendingYear, setPendingYear] = useState<number | null>(null);
  if (year !== prevYear) {
    setPrevYear(year);
    setPendingYear(null);
  }
  const displayYear = pendingYear ?? year;

  function goYear(newYear: number) {
    setPendingYear(newYear);
    const params = new URLSearchParams(searchParams.toString());
    params.set("y", String(newYear));
    router.push(`${pathname}?${params.toString()}`);
  }

  function goToMonth(month: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("y", String(year));
    params.set("m", String(month));
    router.push(`/?${params.toString()}`);
  }

  const scopeIds = useMemo(
    () => scopedAccountIds(accounts, members, ownerScope),
    [accounts, members, ownerScope],
  );
  const scopedTx = useMemo(
    () => transactions.filter((t) => isTransactionInScope(t, scopeIds)),
    [transactions, scopeIds],
  );
  const scopedExpenseTx = useMemo(() => scopedTx.filter((t) => t.kind === "expense"), [scopedTx]);

  const months = useMemo(() => monthlyTotals(scopedTx, year), [scopedTx, year]);
  const maxFlow = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const activeMonths = months.filter((m) => m.hasData).length || 1;
  const yearIncome = months.reduce((s, m) => s + m.income, 0);
  const yearExpense = months.reduce((s, m) => s + m.expense, 0);
  const yearBalance = yearIncome - yearExpense;
  const avgMonthly = Math.round(yearBalance / activeMonths);

  const heatRows = useMemo(
    () => categoryMonthlyTotals(scopedExpenseTx, categories, year),
    [scopedExpenseTx, categories, year],
  );
  const heatMax = Math.max(1, ...heatRows.flatMap((r) => r.monthly));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="month-stepper-btn"
            aria-label="Año anterior"
            onClick={() => goYear(displayYear - 1)}
          >
            ‹
          </button>
          <span key={displayYear} className="month-stepper-label stepper-label-animate">
            {displayYear}
          </span>
          <button
            type="button"
            className="month-stepper-btn"
            aria-label="Año siguiente"
            onClick={() => goYear(displayYear + 1)}
          >
            ›
          </button>
        </div>
        <span className="scope-label">{scopeLabel(ownerScope, members)}</span>
      </div>

      <div className="kpi-grid">
        <div className="kpi-filled" data-tone={yearBalance >= 0 ? "positive" : "negative"}>
          <p className="kicker">Balance del año</p>
          <p className="kpi-figure kpi-figure-30">{signed(yearBalance)}</p>
        </div>
        <div className="kpi-solid-green">
          <p className="kicker">Ingresos</p>
          <p className="kpi-figure kpi-figure-30 figure-positive">{money(yearIncome)}</p>
        </div>
        <div className="kpi-solid-red">
          <p className="kicker">Gastos</p>
          <p className="kpi-figure kpi-figure-30 figure-negative">{money(yearExpense)}</p>
        </div>
        <div className="glass-card">
          <p className="kicker">Media mensual ahorrada</p>
          <p
            className={`kpi-figure kpi-figure-30 ${avgMonthly >= 0 ? "figure-positive" : "figure-negative"}`}
          >
            {signed(avgMonthly)}
          </p>
        </div>
      </div>

      <div className="glass-card flex flex-col gap-4">
        <div className="year-header-row">
          <p className="kicker" style={{ marginRight: "auto" }}>
            Ingresos y gastos por mes
          </p>
          <div className="year-legend">
            <span className="year-legend-item">
              <span className="ranking-chip" style={{ background: "#1f9c5d" }} />
              <span style={{ color: "#0f6b3f" }}>Ingresos</span>
            </span>
            <span className="year-legend-item">
              <span className="ranking-chip" style={{ background: "#ec3013" }} />
              <span style={{ color: "#ae1800" }}>Gastos</span>
            </span>
          </div>
          <span className="year-legend-note">la cifra de arriba es el balance</span>
        </div>

        <div className="year-bars-body">
          {months.map((m) => {
            const hasData = m.hasData;
            const negative = m.balance < 0;
            const balanceColor = !hasData ? "rgba(32,30,29,.35)" : negative ? "#ae1800" : "#0f6b3f";
            const chipBg = !hasData ? "transparent" : negative ? "#f7e3de" : "#e3efe8";
            const chipFg = !hasData ? "rgba(32,30,29,.45)" : negative ? "#ae1800" : "#0f6b3f";
            return (
              <button
                key={m.month}
                type="button"
                className="year-bar-col"
                onClick={() => goToMonth(m.month)}
              >
                <span className="year-bar-balance" style={{ color: balanceColor }}>
                  {hasData ? signed(m.balance) : "—"}
                </span>
                <div className="year-bar-track">
                  <div
                    className="year-bar"
                    title={`Ingresos: ${money(m.income)}`}
                    style={{
                      height: `${(m.income / maxFlow) * 100}%`,
                      minHeight: m.income > 0 ? "3px" : "0px",
                      background: "#1f9c5d",
                    }}
                  />
                  <div
                    className="year-bar"
                    title={`Gastos: ${money(m.expense)}`}
                    style={{
                      height: `${(m.expense / maxFlow) * 100}%`,
                      minHeight: m.expense > 0 ? "3px" : "0px",
                      background: "#ec3013",
                    }}
                  />
                </div>
                <span className="year-bar-chip" style={{ background: chipBg, color: chipFg }}>
                  {MONTHS_SHORT[m.month - 1]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-card flex flex-col gap-4">
        <div>
          <p className="kicker">Categorías × meses</p>
          <p className="text-[11px] font-medium text-[rgba(32,30,29,.45)]">más rojo, más gasto</p>
        </div>

        <div className="heat-grid-wrap">
          <div className="heat-grid-inner">
            <div className="heat-grid-row">
              <span />
              {MONTHS_SHORT.map((label) => (
                <span key={label} className="heat-grid-head-cell">
                  {label}
                </span>
              ))}
              <span className="heat-grid-head-total">Total</span>
            </div>
            {heatRows.map((row) => (
              <div key={row.category.id} className="heat-grid-row">
                <div className="heat-row-name">
                  <span className="dot-chip" style={{ background: row.category.color }} />
                  <span className="truncate">{row.category.name}</span>
                </div>
                {row.monthly.map((amount, i) => {
                  const ratio = amount / heatMax;
                  const blurred = isBlurredCategoryId(row.category.id);
                  return (
                    <div
                      key={i}
                      className="heat-cell"
                      title={
                        blurred
                          ? `${row.category.name} · ${MONTHS_FULL[i]}`
                          : `${row.category.name} · ${MONTHS_FULL[i]}: ${money2(amount)}`
                      }
                      style={{
                        background: amount
                          ? `rgba(236,48,19,${(0.1 + ratio * 0.82).toFixed(3)})`
                          : "rgba(32,30,29,.05)",
                        color: ratio > 0.55 ? "#fff2ef" : "#201e1d",
                      }}
                    >
                      {amount ? (
                        <BlurredAmount categoryId={row.category.id}>
                          {Math.round(amount / 100)}
                        </BlurredAmount>
                      ) : (
                        ""
                      )}
                    </div>
                  );
                })}
                <span className="heat-row-total">
                  <BlurredAmount categoryId={row.category.id}>{money(row.total)}</BlurredAmount>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Account, Category, HouseholdMember, Transaction } from "@/lib/supabase/types";
import { money, money2, signed } from "@/lib/format";
import {
  MONTHS_FULL,
  balanceOf,
  buildDonutGradient,
  categoryTotals,
  formatShortDate,
  isInMonth,
  isThroughMonth,
  isTransactionInScope,
  movementColor,
  movementLabel,
  movementSub,
  scopeLabel,
  scopedAccountIds,
  sumByKind,
  type OwnerScope,
} from "@/lib/derive";

type Props = {
  year: number;
  members: HouseholdMember[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
};

function amountNode(tx: Transaction) {
  if (tx.kind === "expense") {
    return <span className="figure-negative">{signed(-tx.amount_cents, 2)}</span>;
  }
  if (tx.kind === "income") {
    return <span className="figure-positive">{signed(tx.amount_cents, 2)}</span>;
  }
  return <span>{money2(tx.amount_cents)}</span>;
}

export function PanelView({ year, members, accounts, categories, transactions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [notesOpen, setNotesOpen] = useState(true);

  const now = new Date();
  const isCurrentYear = year === now.getFullYear();
  const mParam = searchParams.get("m");
  const month = mParam ? Number(mParam) : isCurrentYear ? now.getMonth() + 1 : 12;
  const ownerScope = (searchParams.get("owner") as OwnerScope | null) ?? "all";

  function go(newYear: number, newMonth: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("y", String(newYear));
    params.set("m", String(newMonth));
    router.push(`${pathname}?${params.toString()}`);
  }

  function stepMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    go(y, m);
  }

  const scopeIds = useMemo(
    () => scopedAccountIds(accounts, members, ownerScope),
    [accounts, members, ownerScope],
  );
  const scopedTx = useMemo(
    () => transactions.filter((t) => isTransactionInScope(t, scopeIds)),
    [transactions, scopeIds],
  );
  const monthTx = useMemo(
    () => scopedTx.filter((t) => isInMonth(t, year, month)),
    [scopedTx, year, month],
  );
  const monthExpenseTx = useMemo(() => monthTx.filter((t) => t.kind === "expense"), [monthTx]);

  const income = sumByKind(monthTx, "income");
  const expense = sumByKind(monthTx, "expense");
  const balance = income - expense;

  const ytdTx = useMemo(
    () => scopedTx.filter((t) => isThroughMonth(t, year, month)),
    [scopedTx, year, month],
  );
  const ytdBalance = balanceOf(ytdTx);

  const catTotals = useMemo(
    () => categoryTotals(monthExpenseTx, categories),
    [monthExpenseTx, categories],
  );
  const largestCategory = catTotals[0]?.totalCents ?? 0;
  const donutGradient = buildDonutGradient(catTotals, expense);

  const notesTx = useMemo(
    () =>
      monthTx
        .filter((t) => t.note.trim() !== "")
        .sort((a, b) => b.amount_cents - a.amount_cents),
    [monthTx],
  );

  const recentTx = monthTx.slice(0, 8);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="month-stepper-btn"
            aria-label="Mes anterior"
            onClick={() => stepMonth(-1)}
          >
            ‹
          </button>
          <span className="month-stepper-label">
            {MONTHS_FULL[month - 1]} {year}
          </span>
          <button
            type="button"
            className="month-stepper-btn"
            aria-label="Mes siguiente"
            onClick={() => stepMonth(1)}
          >
            ›
          </button>
        </div>
        <span className="scope-label">{scopeLabel(ownerScope, members)}</span>
      </div>

      <div className="kpi-grid">
        <div className="glass-card">
          <p className="kicker">Balance del mes</p>
          <p className={`kpi-figure ${balance >= 0 ? "figure-positive" : "figure-negative"}`}>
            {signed(balance)}
          </p>
        </div>
        <div className="kpi-solid-green">
          <p className="kicker">Ingresos</p>
          <p className="kpi-figure figure-positive">{money(income)}</p>
        </div>
        <div className="kpi-solid-red">
          <p className="kicker">Gastos</p>
          <p className="kpi-figure figure-negative">{money(expense)}</p>
        </div>
        <div className="kpi-filled" data-tone={ytdBalance >= 0 ? "positive" : "negative"}>
          <p className="kicker">Ahorrado en {year}</p>
          <p className="kpi-figure">{signed(ytdBalance)}</p>
        </div>
      </div>

      <div className="charts-grid">
        <div className="glass-card flex flex-col items-center gap-4">
          <p className="kicker self-start">Gasto por categoría</p>
          <div className="donut" style={{ background: donutGradient }}>
            <div className="donut-hole">
              <span className="donut-kicker">Total</span>
              <span className="donut-hole-total">{money(expense)}</span>
            </div>
          </div>
        </div>

        <div className="glass-card flex flex-col gap-3">
          <p className="kicker">Ranking</p>
          {catTotals.length === 0 ? (
            <p className="text-sm text-[rgba(32,30,29,.55)]">Sin gastos registrados este mes.</p>
          ) : (
            <div className="flex flex-col gap-[11px]">
              {catTotals.map(({ category, totalCents }) => (
                <div key={category.id} className="ranking-row">
                  <div className="ranking-name">
                    <span className="ranking-chip" style={{ background: category.color }} />
                    <span className="truncate">{category.name}</span>
                  </div>
                  <span className="ranking-amount">{money2(totalCents)}</span>
                  <div className="ranking-track-row">
                    <div className="ranking-track">
                      <div
                        className="ranking-track-fill"
                        style={{
                          width: `${(totalCents / largestCategory) * 100}%`,
                          background: category.color,
                        }}
                      />
                    </div>
                    <span className="ranking-share">
                      {Math.round((totalCents / expense) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card flex flex-col">
        <button type="button" className="notes-header-btn" onClick={() => setNotesOpen((v) => !v)}>
          <span className="kicker">Notas del mes</span>
          {notesTx.length > 0 && <span className="notes-badge">{notesTx.length}</span>}
          <span className="notes-toggle">{notesOpen ? "Ocultar" : "Ver"}</span>
        </button>
        {notesOpen &&
          (notesTx.length === 0 ? (
            <p className="mt-3 text-sm text-[rgba(32,30,29,.55)]">
              Ningún movimiento de este mes tiene nota. Escribe una al añadir un gasto y aparecerá
              aquí.
            </p>
          ) : (
            <div>
              {notesTx.map((tx) => (
                <div key={tx.id} className="notes-row">
                  <div className="notes-row-left">
                    <span className="dot-chip" style={{ background: movementColor(tx, categories) }} />
                    <span className="notes-row-label truncate">{movementLabel(tx, categories)}</span>
                    <span className="notes-row-date">{formatShortDate(tx.occurred_on)}</span>
                  </div>
                  <span className="notes-row-amount">{amountNode(tx)}</span>
                  <p className="notes-row-text">{tx.note}</p>
                </div>
              ))}
            </div>
          ))}
      </div>

      <div className="glass-card flex flex-col">
        <p className="kicker mb-2">Últimos movimientos</p>
        {recentTx.length === 0 ? (
          <p className="text-sm text-[rgba(32,30,29,.55)]">Sin movimientos este mes.</p>
        ) : (
          recentTx.map((tx) => (
            <div key={tx.id} className="movement-row">
              <span className="movement-date">{formatShortDate(tx.occurred_on)}</span>
              <div className="movement-mid">
                <div className="movement-label-row">
                  <span className="dot-chip" style={{ background: movementColor(tx, categories) }} />
                  <span className="movement-label truncate">{movementLabel(tx, categories)}</span>
                </div>
                <p className="movement-sub truncate">{movementSub(tx, accounts, members)}</p>
              </div>
              <span className="movement-amount">{amountNode(tx)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

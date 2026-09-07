"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Account, Category, HouseholdMember, MovementKind, Transaction } from "@/lib/supabase/types";
import { money2, signed } from "@/lib/format";
import {
  formatMonthLabel,
  formatShortDateWithYear,
  isTransactionInScope,
  monthKey,
  movementColor,
  movementLabel,
  movementSub,
  scopedAccountIds,
  type OwnerScope,
} from "@/lib/derive";
import { useMovementSheet } from "@/components/movement-sheet";
import { deleteTransaction } from "@/lib/mutations";

type Props = {
  members: HouseholdMember[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
};

const TYPE_OPTIONS: { value: "all" | MovementKind; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "expense", label: "Solo gastos" },
  { value: "income", label: "Solo ingresos" },
  { value: "transfer", label: "Solo traspasos" },
];

const MAX_ROWS = 300;

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function amountNode(tx: Transaction) {
  if (tx.kind === "expense") {
    return <span>{signed(-tx.amount_cents, 2)}</span>;
  }
  if (tx.kind === "income") {
    return <span className="figure-positive">{signed(tx.amount_cents, 2)}</span>;
  }
  return <span className="figure-transfer">{money2(tx.amount_cents)}</span>;
}

export function MovimientosView({ members, accounts, categories, transactions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openEdit } = useMovementSheet();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [searchText, setSearchText] = useState(() => searchParams.get("q") ?? "");

  const ownerScope = (searchParams.get("owner") as OwnerScope | null) ?? "all";
  const typeParam = (searchParams.get("t") as MovementKind | "all" | null) ?? "all";
  const catParam = searchParams.get("cat") ?? "all";
  const monthParam = searchParams.get("mm") ?? currentMonthKey();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  // "mm" defaults to the current month rather than "all", so unlike setParam
  // above, "all" must be written explicitly instead of clearing the param.
  function setMonthParam(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mm", value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  useEffect(() => {
    const id = setTimeout(() => setParam("q", searchText), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const scopeIds = useMemo(
    () => scopedAccountIds(accounts, members, ownerScope),
    [accounts, members, ownerScope],
  );
  const scopedTx = useMemo(
    () => transactions.filter((t) => isTransactionInScope(t, scopeIds) && !deletedIds.has(t.id)),
    [transactions, scopeIds, deletedIds],
  );

  const monthOptions = useMemo(() => {
    const keys = new Set(scopedTx.map((t) => monthKey(t.occurred_on)));
    keys.add(currentMonthKey());
    return [...keys].sort().reverse();
  }, [scopedTx]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return scopedTx.filter((t) => {
      if (typeParam !== "all" && t.kind !== typeParam) return false;
      if (catParam !== "all" && t.category_id !== catParam) return false;
      if (monthParam !== "all" && monthKey(t.occurred_on) !== monthParam) return false;
      if (q) {
        const label = movementLabel(t, categories).toLowerCase();
        const note = t.note.toLowerCase();
        if (!label.includes(q) && !note.includes(q)) return false;
      }
      return true;
    });
  }, [scopedTx, typeParam, catParam, monthParam, searchText, categories]);

  const summarySum = useMemo(
    () =>
      filtered.reduce((sum, t) => {
        if (t.kind === "income") return sum + t.amount_cents;
        if (t.kind === "expense") return sum - t.amount_cents;
        return sum;
      }, 0),
    [filtered],
  );

  const rows = filtered.slice(0, MAX_ROWS);

  async function handleDelete(id: string) {
    setDeleteError(null);
    setDeletedIds((prev) => new Set(prev).add(id));
    try {
      await deleteTransaction(id);
      router.refresh();
    } catch {
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDeleteError("No se ha podido borrar. Inténtalo de nuevo.");
    }
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    handleDelete(pendingDelete.id);
    setPendingDelete(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="view-title">Movimientos</h1>

      <div className="filter-bar">
        <select
          className="filter-control"
          value={typeParam}
          onChange={(e) => setParam("t", e.target.value)}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          className="filter-control"
          value={catParam}
          onChange={(e) => setParam("cat", e.target.value)}
        >
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="filter-control"
          value={monthParam}
          onChange={(e) => setMonthParam(e.target.value)}
        >
          <option value="all">Todos los meses</option>
          {monthOptions.map((key) => (
            <option key={key} value={key}>
              {formatMonthLabel(key)}
            </option>
          ))}
        </select>

        <input
          className="filter-control filter-search"
          placeholder="Buscar nota…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <span className="filter-summary">
          {filtered.length} mov. · {signed(summarySum)}
        </span>
      </div>

      {deleteError && <p className="field-error">{deleteError}</p>}

      <div className="movement-list">
        {rows.length === 0 ? (
          <p className="text-sm text-[rgba(32,30,29,.55)] p-5">
            Ningún movimiento con estos filtros.
          </p>
        ) : (
          rows.map((tx) => (
            <div key={tx.id} className="movement-list-row">
              <span className="movement-date">{formatShortDateWithYear(tx.occurred_on)}</span>
              <div className="movement-mid">
                <div className="movement-label-row">
                  <span className="dot-chip" style={{ background: movementColor(tx, categories) }} />
                  <span className="movement-label truncate">{movementLabel(tx, categories)}</span>
                </div>
                <p className="movement-sub truncate">{movementSub(tx, accounts, members)}</p>
              </div>
              <span className="movement-amount">{amountNode(tx)}</span>
              <div className="row-actions">
                <button
                  type="button"
                  className="row-action-btn"
                  aria-label="Editar movimiento"
                  onClick={() => openEdit(tx)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="row-action-btn"
                  data-variant="delete"
                  aria-label="Borrar movimiento"
                  onClick={() => setPendingDelete(tx)}
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {pendingDelete && (
        <div className="confirm-veil" onClick={() => setPendingDelete(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-title">Borrar movimiento</p>
            <p className="confirm-text">
              ¿Seguro que quieres borrar «{movementLabel(pendingDelete, categories)}» del{" "}
              {formatShortDateWithYear(pendingDelete.occurred_on)}? Esta acción no se puede
              deshacer.
            </p>
            <div className="confirm-actions">
              <button type="button" className="btn-delete" onClick={confirmDelete}>
                Borrar
              </button>
              <button type="button" className="btn-cancel" onClick={() => setPendingDelete(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

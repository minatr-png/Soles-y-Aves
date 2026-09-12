"use client";

import { createContext, useContext, useRef, useState, use, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Account, Category, HouseholdMember, MovementKind, Transaction } from "@/lib/supabase/types";
import { ownerLabel } from "@/lib/derive";
import { createTransaction, updateTransaction } from "@/lib/mutations";

export type MovementSheetData = {
  householdId: string;
  accounts: Account[];
  categories: Category[];
  members: HouseholdMember[];
};

type FormState = {
  id: string | null;
  kind: MovementKind;
  amount: string;
  date: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  note: string;
};

type MovementSheetContextValue = {
  openNew: () => void;
  openEdit: (tx: Transaction) => void;
};

const MovementSheetContext = createContext<MovementSheetContextValue | null>(null);

export function useMovementSheet(): MovementSheetContextValue {
  const ctx = useContext(MovementSheetContext);
  if (!ctx) throw new Error("useMovementSheet debe usarse dentro de MovementSheetProvider");
  return ctx;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyForm(): FormState {
  return {
    id: null,
    kind: "expense",
    amount: "",
    date: todayIso(),
    accountId: "",
    toAccountId: "",
    categoryId: "",
    note: "",
  };
}

function normalizeAmountInput(value: string): string {
  const sanitized = value.replace(/[^\d,.-]/g, "");
  if (!sanitized) return "";

  const normalized = sanitized.replace(",", ".");
  const pieces = normalized.split(".");

  if (pieces.length > 2) {
    return `${pieces[0]}.${pieces.slice(1).join("")}`;
  }

  if (normalized === "." || normalized === "-") return "";

  return normalized;
}

function finalizeAmountInput(value: string): string {
  const normalized = normalizeAmountInput(value);
  if (!normalized) return "";

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return "";

  return `${numeric.toFixed(2)}€`;
}

function formFromTransaction(tx: Transaction): FormState {
  return {
    id: tx.id,
    kind: tx.kind,
    amount: finalizeAmountInput((tx.amount_cents / 100).toFixed(2)),
    date: tx.occurred_on,
    accountId: tx.account_id,
    toAccountId: tx.to_account_id ?? "",
    categoryId: tx.category_id ?? "",
    note: tx.note,
  };
}

const KIND_LABEL: Record<MovementKind, string> = {
  expense: "Gasto",
  income: "Ingreso",
  transfer: "Traspaso",
};

type Props = {
  dataPromise: Promise<MovementSheetData | null>;
  children: React.ReactNode;
};

// The provider itself never awaits `dataPromise`, so it and `children` render
// immediately; only opening the sheet (SheetForm, below) resolves it, behind
// its own Suspense boundary that doesn't gate the rest of the page.
export function MovementSheetProvider({ dataPromise, children }: Props) {
  const [form, setForm] = useState<FormState | null>(null);

  function openNew() {
    setForm(emptyForm());
  }

  function openEdit(tx: Transaction) {
    setForm(formFromTransaction(tx));
  }

  function close() {
    setForm(null);
  }

  return (
    <MovementSheetContext.Provider value={{ openNew, openEdit }}>
      {children}

      <button type="button" className="fab" aria-label="Añadir movimiento" onClick={openNew}>
        +
      </button>

      {form && (
        <Suspense fallback={<SheetFallback onClose={close} />}>
          <SheetForm dataPromise={dataPromise} form={form} onFormChange={setForm} onClose={close} />
        </Suspense>
      )}
    </MovementSheetContext.Provider>
  );
}

function SheetFallback({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-veil" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle">
          <span className="sheet-handle-bar" />
        </div>
        <p className="mt-2 text-sm text-[rgba(32,30,29,.7)]">Cargando…</p>
      </div>
    </div>
  );
}

type SheetFormProps = {
  dataPromise: Promise<MovementSheetData | null>;
  form: FormState;
  onFormChange: (form: FormState) => void;
  onClose: () => void;
};

function SheetForm({ dataPromise, form, onFormChange, onClose }: SheetFormProps) {
  const data = use(dataPromise);
  const router = useRouter();
  const pathname = usePathname();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);

  const accounts = data?.accounts ?? [];
  const categories = data?.categories ?? [];
  const members = data?.members ?? [];

  function closeSheet() {
    onClose();
    setSaving(false);
    setDragY(0);
    setDragging(false);
    dragStartY.current = null;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartY.current = e.clientY;
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    setDragY(Math.max(0, e.clientY - dragStartY.current));
  }

  function handlePointerUp() {
    if (dragStartY.current === null) return;
    dragStartY.current = null;
    setDragging(false);
    if (dragY > 120) {
      closeSheet();
    } else {
      setDragY(0);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) {
      setError("Tu usuario no pertenece a ningún household todavía.");
      return;
    }

    const rawAmount = form.amount.trim();
    const amount = Number(rawAmount.replace(/€/g, "").replace(",", "."));
    if (!rawAmount || !Number.isFinite(amount) || amount <= 0) {
      setError("Introduce un importe válido.");
      return;
    }
    if (!form.accountId) {
      setError(form.kind === "transfer" ? "Elige la cuenta de origen." : "Elige una cuenta.");
      return;
    }
    if (form.kind === "transfer" && (!form.toAccountId || form.toAccountId === form.accountId)) {
      setError("Elige dos cuentas distintas para el traspaso.");
      return;
    }
    if (form.kind === "expense" && !form.categoryId) {
      setError("Elige una categoría.");
      return;
    }

    const input = {
      kind: form.kind,
      amountCents: Math.round(amount * 100),
      occurredOn: form.date,
      accountId: form.accountId,
      toAccountId: form.kind === "transfer" ? form.toAccountId : null,
      categoryId: form.kind === "expense" ? form.categoryId : null,
      note: form.note.trim(),
    };

    setSaving(true);
    setError(null);
    try {
      if (form.id) {
        await updateTransaction(form.id, input);
      } else {
        await createTransaction(data.householdId, input);
      }
      closeSheet();
      if (pathname === "/") {
        const [year, month] = form.date.split("-");
        router.push(`/?y=${year}&m=${Number(month)}`);
      }
      router.refresh();
    } catch {
      setSaving(false);
      setError("No se ha podido guardar. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="sheet-veil" onClick={closeSheet}>
      <div
        className="sheet"
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          animation: dragging ? "none" : undefined,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sheet-handle"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <span className="sheet-handle-bar" />
        </div>

        <div className="sheet-header">
          <h2 className="sheet-title">{form.id ? "Editar movimiento" : "Nuevo movimiento"}</h2>
          <button type="button" className="sheet-close" aria-label="Cerrar" onClick={closeSheet}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
          <div className="kind-switch">
            {(Object.keys(KIND_LABEL) as MovementKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                className="kind-btn"
                data-kind={kind}
                data-active={form.kind === kind}
                onClick={() => onFormChange({ ...form, kind })}
              >
                {KIND_LABEL[kind]}
              </button>
            ))}
          </div>

          <label className="field">
            <span className="field-label">Importe (€)</span>
            <input
              className="field-control field-amount"
              inputMode="decimal"
              placeholder="0.00€"
              value={form.amount}
              onFocus={() => {
                if (form.amount.endsWith("€")) {
                  onFormChange({ ...form, amount: form.amount.replace(/€/g, "") });
                }
              }}
              onBlur={() => {
                onFormChange({ ...form, amount: finalizeAmountInput(form.amount) });
              }}
              onChange={(e) => onFormChange({ ...form, amount: normalizeAmountInput(e.target.value) })}
            />
          </label>

          <label className="field">
            <span className="field-label">Fecha</span>
            <input
              type="date"
              className="field-control"
              value={form.date}
              onChange={(e) => onFormChange({ ...form, date: e.target.value })}
            />
          </label>

          <label className="field">
            <span className="field-label">{form.kind === "transfer" ? "Desde" : "Cuenta"}</span>
            <select
              className="field-control"
              value={form.accountId}
              onChange={(e) => onFormChange({ ...form, accountId: e.target.value })}
            >
              <option value="" disabled>
                Selecciona una cuenta
              </option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} — {ownerLabel(account, members)}
                </option>
              ))}
            </select>
          </label>

          {form.kind === "transfer" && (
            <>
              <label className="field">
                <span className="field-label">Hacia</span>
                <select
                  className="field-control"
                  value={form.toAccountId}
                  onChange={(e) => onFormChange({ ...form, toAccountId: e.target.value })}
                >
                  <option value="" disabled>
                    Selecciona una cuenta
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} — {ownerLabel(account, members)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="field-hint">
                Los traspasos no cuentan como gasto ni como ingreso: solo mueven saldo entre
                cuentas.
              </p>
            </>
          )}

          {form.kind === "expense" && (
            <label className="field">
              <span className="field-label">Categoría</span>
              <select
                className="field-control"
                value={form.categoryId}
                onChange={(e) => onFormChange({ ...form, categoryId: e.target.value })}
              >
                <option value="" disabled>
                  Selecciona una categoría
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field">
            <span className="field-label">Nota</span>
            <input
              className="field-control"
              placeholder="Opcional"
              value={form.note}
              onChange={(e) => onFormChange({ ...form, note: e.target.value })}
            />
          </label>

          {error && <p className="field-error">{error}</p>}

          <div className="sheet-actions">
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" className="btn-cancel" onClick={closeSheet}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

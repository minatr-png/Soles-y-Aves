"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Account, Category, HouseholdMember, Transaction } from "@/lib/supabase/types";
import { moneyBalance } from "@/lib/format";
import { accountBalance, accountUsageCount, categoryUsageCount } from "@/lib/derive";
import {
  archiveAccount,
  archiveCategory,
  createAccount,
  createCategory,
  renameAccount,
  renameCategory,
  updateAccountOwner,
} from "@/lib/mutations";
import { signOut } from "@/app/actions";

type Props = {
  householdId: string;
  members: HouseholdMember[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
};

const DEFAULT_COLOR = "#ec3013";

export function AjustesView({ householdId, members, accounts, categories, transactions }: Props) {
  const router = useRouter();

  const [catNames, setCatNames] = useState<Record<string, string>>({});
  const [accNames, setAccNames] = useState<Record<string, string>>({});
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(DEFAULT_COLOR);
  const [newAccName, setNewAccName] = useState("");
  const [newAccOwner, setNewAccOwner] = useState(members[0]?.user_id ?? "");
  const [catError, setCatError] = useState<string | null>(null);
  const [accError, setAccError] = useState<string | null>(null);

  useEffect(() => {
    setCatNames(Object.fromEntries(categories.map((c) => [c.id, c.name])));
  }, [categories]);

  useEffect(() => {
    setAccNames(Object.fromEntries(accounts.map((a) => [a.id, a.name])));
  }, [accounts]);

  const ownerOptions = [
    ...members.map((m) => ({ value: m.user_id, label: m.display_name ?? "Miembro" })),
    { value: "", label: "Conjunta" },
  ];

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    setCatError(null);
    try {
      await createCategory(householdId, name, newCatColor, categories.length);
      setNewCatName("");
      setNewCatColor(DEFAULT_COLOR);
      router.refresh();
    } catch {
      setCatError("No se ha podido crear la categoría.");
    }
  }

  async function handleCatNameBlur(category: Category) {
    const value = catNames[category.id]?.trim();
    if (!value || value === category.name) {
      setCatNames((prev) => ({ ...prev, [category.id]: category.name }));
      return;
    }
    setCatError(null);
    try {
      await renameCategory(category.id, value);
      router.refresh();
    } catch {
      setCatNames((prev) => ({ ...prev, [category.id]: category.name }));
      setCatError("No se ha podido renombrar la categoría.");
    }
  }

  async function handleDeleteCategory(category: Category) {
    if (categoryUsageCount(category.id, transactions) > 0) return;
    setCatError(null);
    try {
      await archiveCategory(category.id);
      router.refresh();
    } catch {
      setCatError("No se ha podido borrar la categoría.");
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    const name = newAccName.trim();
    if (!name) return;
    setAccError(null);
    try {
      await createAccount(householdId, name, newAccOwner || null, accounts.length);
      setNewAccName("");
      router.refresh();
    } catch {
      setAccError("No se ha podido crear la cuenta.");
    }
  }

  async function handleAccNameBlur(account: Account) {
    const value = accNames[account.id]?.trim();
    if (!value || value === account.name) {
      setAccNames((prev) => ({ ...prev, [account.id]: account.name }));
      return;
    }
    setAccError(null);
    try {
      await renameAccount(account.id, value);
      router.refresh();
    } catch {
      setAccNames((prev) => ({ ...prev, [account.id]: account.name }));
      setAccError("No se ha podido renombrar la cuenta.");
    }
  }

  async function handleOwnerChange(account: Account, value: string) {
    setAccError(null);
    try {
      await updateAccountOwner(account.id, value || null);
      router.refresh();
    } catch {
      setAccError("No se ha podido cambiar el titular.");
    }
  }

  async function handleDeleteAccount(account: Account) {
    if (accountUsageCount(account.id, transactions) > 0) return;
    setAccError(null);
    try {
      await archiveAccount(account.id);
      router.refresh();
    } catch {
      setAccError("No se ha podido borrar la cuenta.");
    }
  }

  return (
    <div className="settings-grid">
      <div className="glass-card">
        <h2 className="settings-card-title">Categorías</h2>
        <p className="settings-help">
          Elige el color al crearla. Solo se pueden borrar las que no tengan movimientos.
        </p>

        <form className="create-row" onSubmit={handleCreateCategory}>
          <input
            type="color"
            className="color-input"
            value={newCatColor}
            onChange={(e) => setNewCatColor(e.target.value)}
            aria-label="Color de la categoría"
          />
          <input
            className="create-name-input"
            placeholder="Nueva categoría"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />
          <button type="submit" className="btn-add">
            Añadir
          </button>
        </form>

        {catError && <p className="field-error">{catError}</p>}

        <div>
          {categories.map((category) => {
            const usage = categoryUsageCount(category.id, transactions);
            return (
              <div key={category.id} className="category-row">
                <span className="category-swatch" style={{ background: category.color }} />
                <input
                  className="category-name-input"
                  value={catNames[category.id] ?? category.name}
                  onChange={(e) =>
                    setCatNames((prev) => ({ ...prev, [category.id]: e.target.value }))
                  }
                  onBlur={() => handleCatNameBlur(category)}
                />
                <span className="cat-usage">{usage} mov.</span>
                <button
                  type="button"
                  className="row-action-btn"
                  aria-label="Borrar categoría"
                  disabled={usage > 0}
                  onClick={() => handleDeleteCategory(category)}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card">
        <h2 className="settings-card-title">Cuentas</h2>
        <p className="settings-help">
          Cambia el nombre o el titular. Solo se borran las cuentas sin movimientos.
        </p>

        <form className="create-row" onSubmit={handleCreateAccount}>
          <input
            className="create-name-input"
            placeholder="Nueva cuenta"
            value={newAccName}
            onChange={(e) => setNewAccName(e.target.value)}
          />
          <select
            className="filter-control"
            value={newAccOwner}
            onChange={(e) => setNewAccOwner(e.target.value)}
          >
            {ownerOptions.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-add">
            Añadir
          </button>
        </form>

        {accError && <p className="field-error">{accError}</p>}

        <div>
          {accounts.map((account) => {
            const usage = accountUsageCount(account.id, transactions);
            return (
              <div key={account.id} className="account-row">
                <div className="account-row-top">
                  <input
                    className="account-name-input"
                    value={accNames[account.id] ?? account.name}
                    onChange={(e) =>
                      setAccNames((prev) => ({ ...prev, [account.id]: e.target.value }))
                    }
                    onBlur={() => handleAccNameBlur(account)}
                  />
                  <span className="account-saldo">
                    {moneyBalance(accountBalance(account.id, transactions))}
                  </span>
                </div>
                <div className="account-row-bottom">
                  <select
                    className="owner-select"
                    value={account.owner_user_id ?? ""}
                    onChange={(e) => handleOwnerChange(account, e.target.value)}
                    aria-label={`Titular de ${account.name}`}
                  >
                    {ownerOptions.map((opt) => (
                      <option key={opt.label} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="acc-usage">{usage} mov.</span>
                  <button
                    type="button"
                    className="row-action-btn"
                    aria-label="Borrar cuenta"
                    disabled={usage > 0}
                    onClick={() => handleDeleteAccount(account)}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="settings-footer">
          <span className="text-sm text-[rgba(32,30,29,.55)]">Sesión iniciada</span>
          <form action={signOut}>
            <button type="submit" className="btn-signout">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

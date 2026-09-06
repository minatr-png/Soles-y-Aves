// Escrituras desde cliente (no "server-only"): usadas por la hoja de
// movimiento para guardar con la sesión ya autenticada en el navegador.

import { createClient } from "@/lib/supabase/client";
import type { Account, Category, MovementKind, Transaction } from "@/lib/supabase/types";

export type MovementInput = {
  kind: MovementKind;
  amountCents: number;
  occurredOn: string;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  note: string;
};

export async function createTransaction(
  householdId: string,
  input: MovementInput,
): Promise<Transaction> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      household_id: householdId,
      kind: input.kind,
      amount_cents: input.amountCents,
      occurred_on: input.occurredOn,
      account_id: input.accountId,
      to_account_id: input.toAccountId,
      category_id: input.categoryId,
      note: input.note,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Se crea con color a elección; una vez creada la categoría no se recolorea
// (ver README, sección "Categorías y cuentas").
export async function createCategory(
  householdId: string,
  name: string,
  color: string,
  sortOrder: number,
): Promise<Category> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ household_id: householdId, name, color, sort_order: sortOrder })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("categories").update({ name }).eq("id", id);
  if (error) throw error;
}

// Borrado real; se llama solo cuando la categoría no tiene movimientos.
export async function archiveCategory(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("categories").update({ archived: true }).eq("id", id);
  if (error) throw error;
}

// owner_user_id null = cuenta conjunta.
export async function createAccount(
  householdId: string,
  name: string,
  ownerUserId: string | null,
  sortOrder: number,
): Promise<Account> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert({ household_id: householdId, name, owner_user_id: ownerUserId, sort_order: sortOrder })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function renameAccount(id: string, name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("accounts").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function updateAccountOwner(id: string, ownerUserId: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("accounts")
    .update({ owner_user_id: ownerUserId })
    .eq("id", id);
  if (error) throw error;
}

export async function archiveAccount(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("accounts").update({ archived: true }).eq("id", id);
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function updateTransaction(
  id: string,
  input: MovementInput,
): Promise<Transaction> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({
      kind: input.kind,
      amount_cents: input.amountCents,
      occurred_on: input.occurredOn,
      account_id: input.accountId,
      to_account_id: input.toAccountId,
      category_id: input.categoryId,
      note: input.note,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

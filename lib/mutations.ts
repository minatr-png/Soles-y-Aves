// Escrituras desde cliente (no "server-only"): usadas por la hoja de
// movimiento para guardar con la sesión ya autenticada en el navegador.

import { createClient } from "@/lib/supabase/client";
import type { MovementKind, Transaction } from "@/lib/supabase/types";

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

import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Account,
  Category,
  Household,
  HouseholdMember,
  Transaction,
} from "@/lib/supabase/types";

// cache() dedupes calls within a single request: the layout and every page
// call getHousehold()/listMembers()/etc with the same arguments, so without
// this each navigation issued the same Supabase queries twice.
export const getHousehold = cache(async (): Promise<Household | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Embeds households(*) in the household_members query (single FK, see
  // SCHEMA.sql) instead of a second round trip to look it up by id.
  const { data: membership, error } = await supabase
    .from("household_members")
    .select("households(*)")
    .eq("user_id", user.id)
    .limit(1);

  if (error) throw error;
  const households = membership?.[0]?.households;
  return (Array.isArray(households) ? households[0] : households) ?? null;
});

export const listMembers = cache(async (householdId: string): Promise<HouseholdMember[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("household_members")
    .select("*")
    .eq("household_id", householdId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
});

export const listAccounts = cache(async (householdId: string): Promise<Account[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("household_id", householdId)
    .eq("archived", false)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
});

export const listCategories = cache(async (householdId: string): Promise<Category[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("household_id", householdId)
    .eq("archived", false)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
});

export const listTransactionsForYear = cache(
  async (householdId: string, year: number): Promise<Transaction[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("household_id", householdId)
      .gte("occurred_on", `${year}-01-01`)
      .lt("occurred_on", `${year + 1}-01-01`)
      .order("occurred_on", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
);

// Sin filtro de año: usado para el saldo total en cuentas (ver saldo(account)
// en SCHEMA.sql, sección "reading"), que necesita el histórico completo.
export const listAllTransactions = cache(async (householdId: string): Promise<Transaction[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("household_id", householdId)
    .order("occurred_on", { ascending: false });

  if (error) throw error;
  return data ?? [];
});

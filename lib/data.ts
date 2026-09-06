import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Account,
  Category,
  Household,
  HouseholdMember,
  Transaction,
} from "@/lib/supabase/types";

export async function getHousehold(): Promise<Household | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1);

  if (membershipError) throw membershipError;
  const householdId = membership?.[0]?.household_id;
  if (!householdId) return null;

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("*")
    .eq("id", householdId)
    .single();

  if (householdError) throw householdError;
  return household;
}

export async function listMembers(householdId: string): Promise<HouseholdMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("household_members")
    .select("*")
    .eq("household_id", householdId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listAccounts(householdId: string): Promise<Account[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("household_id", householdId)
    .eq("archived", false)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listCategories(householdId: string): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("household_id", householdId)
    .eq("archived", false)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listTransactionsForYear(
  householdId: string,
  year: number,
): Promise<Transaction[]> {
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
}

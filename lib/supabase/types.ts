// Tipos que reflejan design_handoff_shared_savings/SCHEMA.sql. El dinero se
// guarda siempre en céntimos (bigint en la base de datos, number aquí).

export type MovementKind = "expense" | "income" | "transfer";

export type Household = {
  id: string;
  name: string;
  created_at: string;
};

export type HouseholdMember = {
  household_id: string;
  user_id: string;
  display_name: string | null;
  joined_at: string;
};

export type Account = {
  id: string;
  household_id: string;
  name: string;
  // null = cuenta conjunta ("Conjunta")
  owner_user_id: string | null;
  archived: boolean;
  sort_order: number;
  created_at: string;
};

export type Category = {
  id: string;
  household_id: string;
  name: string;
  color: string;
  archived: boolean;
  sort_order: number;
  created_at: string;
};

export type Transaction = {
  id: string;
  household_id: string;
  kind: MovementKind;
  // siempre positivo; el tipo (kind) marca la dirección
  amount_cents: number;
  occurred_on: string; // 'YYYY-MM-DD'
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  note: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

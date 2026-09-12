-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
-- Source of truth: Supabase (Postgres). Regenerate/update this file whenever the DB structure
-- changes so it never drifts from what's actually deployed — see the codebase-guide skill's
-- "Keeping this file current" section for the update rule.

CREATE TABLE public.households (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT households_pkey PRIMARY KEY (id)
);
CREATE TABLE public.household_members (
  household_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT household_members_pkey PRIMARY KEY (household_id, user_id),
  CONSTRAINT household_members_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id),
  CONSTRAINT household_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  name text NOT NULL,
  owner_user_id uuid,
  archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id),
  CONSTRAINT accounts_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL,
  archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  kind USER-DEFINED NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  occurred_on date NOT NULL,
  account_id uuid NOT NULL,
  to_account_id uuid,
  category_id uuid,
  note text NOT NULL DEFAULT ''::text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id),
  CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT transactions_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.accounts(id),
  CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- `kind` (USER-DEFINED above) is a Postgres enum, values: 'expense' | 'income' | 'transfer'
-- (mirrored in app code as MovementKind, lib/supabase/types.ts).

-- RLS: every table above is household-scoped via a `security definer is_member(household_id)`
-- helper (not visible in this dump — check Supabase's Database > Policies UI or
-- `pg_get_functiondef('public.is_member'::regproc)` for the exact definition before relying on it).

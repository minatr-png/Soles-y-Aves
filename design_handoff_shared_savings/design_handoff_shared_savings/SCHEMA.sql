-- Shared Savings Manager — proposed Postgres schema for Supabase
-- Money is stored as integer cents. Dates are `date`, not timestamptz:
-- a movement happens on a day, not at an instant.

create type movement_kind as enum ('expense', 'income', 'transfer');

-- ---------------------------------------------------------------- households

create table households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  -- shown in the person filter; falls back to the auth user's email
  display_name text,
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Helper used by every policy. SECURITY DEFINER so the policy on
-- household_members cannot recurse into itself.
create or replace function is_member(h uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from household_members m
    where m.household_id = h and m.user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------- accounts

create table accounts (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,
  -- NULL  = joint account ("Conjunta")
  -- set    = personal account of that member
  owner_user_id uuid references auth.users(id) on delete set null,
  archived      boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index accounts_household_idx on accounts(household_id) where not archived;

-- --------------------------------------------------------------- categories

create table categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  color        text not null,               -- '#rrggbb', chosen at creation
  archived     boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  unique (household_id, name)
);

create index categories_household_idx on categories(household_id) where not archived;

-- ------------------------------------------------------------- transactions

create table transactions (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references households(id) on delete cascade,
  kind            movement_kind not null,
  -- always positive; the kind carries the direction
  amount_cents    bigint not null check (amount_cents > 0),
  occurred_on     date not null,
  -- expense/income: the account hit. transfer: the source account.
  account_id      uuid not null references accounts(id) on delete restrict,
  -- transfer only: the destination account
  to_account_id   uuid references accounts(id) on delete restrict,
  -- expense only
  category_id     uuid references categories(id) on delete restrict,
  note            text not null default '',
  created_by      uuid not null default auth.uid() references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- an expense is categorised and has no destination
  constraint expense_shape check (
    kind <> 'expense' or (category_id is not null and to_account_id is null)
  ),
  -- an income has neither category nor destination
  constraint income_shape check (
    kind <> 'income' or (category_id is null and to_account_id is null)
  ),
  -- a transfer has two different accounts and no category
  constraint transfer_shape check (
    kind <> 'transfer' or (
      category_id is null
      and to_account_id is not null
      and to_account_id <> account_id
    )
  )
);

-- The list and the month/year views always slice by household + date.
create index tx_household_date_idx on transactions(household_id, occurred_on desc);
create index tx_account_idx        on transactions(account_id);
create index tx_to_account_idx     on transactions(to_account_id) where to_account_id is not null;
create index tx_category_idx       on transactions(category_id) where category_id is not null;

-- Referenced tables must belong to the same household as the movement.
create or replace function tx_same_household()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from accounts a
                 where a.id = new.account_id and a.household_id = new.household_id) then
    raise exception 'account_id belongs to another household';
  end if;
  if new.to_account_id is not null and not exists (
       select 1 from accounts a
       where a.id = new.to_account_id and a.household_id = new.household_id) then
    raise exception 'to_account_id belongs to another household';
  end if;
  if new.category_id is not null and not exists (
       select 1 from categories c
       where c.id = new.category_id and c.household_id = new.household_id) then
    raise exception 'category_id belongs to another household';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger tx_same_household_trg
  before insert or update on transactions
  for each row execute function tx_same_household();

-- ---------------------------------------------------------------------- RLS
-- One shape for every table: you see a row if you are a member of its household.

alter table households        enable row level security;
alter table household_members enable row level security;
alter table accounts          enable row level security;
alter table categories        enable row level security;
alter table transactions      enable row level security;

create policy households_read on households
  for select using (is_member(id));

create policy members_read on household_members
  for select using (is_member(household_id));

create policy accounts_all on accounts
  for all using (is_member(household_id)) with check (is_member(household_id));

create policy categories_all on categories
  for all using (is_member(household_id)) with check (is_member(household_id));

create policy transactions_all on transactions
  for all using (is_member(household_id)) with check (is_member(household_id));

-- Membership changes and household creation go through a server action /
-- edge function with the service role — deliberately not writable from the client.

-- ------------------------------------------------------------------ reading
-- The app fetches a year at a time and derives everything client side:
--
--   select * from transactions
--   where household_id = $1
--     and occurred_on >= make_date($2, 1, 1)
--     and occurred_on <  make_date($2 + 1, 1, 1)
--   order by occurred_on desc;
--
-- Person filter (client or query):
--   Miguel / Mayté -> accounts where owner_user_id = <uid>
--   Conjunta       -> accounts where owner_user_id is null
--   a transfer is in scope when EITHER account_id OR to_account_id is in scope.
--
-- Aggregation rules, in one place, because this is the easy thing to break:
--   income(month)  = sum(amount) where kind = 'income'
--   expense(month) = sum(amount) where kind = 'expense'
--   balance(month) = income - expense           -- transfers excluded
--   saldo(account) = + income on it
--                    - expense on it
--                    - transfers where account_id      = it
--                    + transfers where to_account_id   = it
--
-- Optional convenience view for the yearly heat grid, if the client-side
-- derivation ever stops being enough:
--
-- create view monthly_category_totals as
-- select household_id,
--        date_trunc('month', occurred_on)::date as month,
--        category_id,
--        sum(amount_cents) as total_cents
-- from transactions
-- where kind = 'expense'
-- group by 1, 2, 3;

-- --------------------------------------------------------------- seed rows
-- Initial categories and accounts, verbatim from the design.
-- Run once per household, with :hid bound to the new household id.
--
-- insert into categories (household_id, name, color, sort_order) values
--   (:hid, 'La compra',     '#ec3013',  0),
--   (:hid, 'Energía',       '#201e1d',  1),
--   (:hid, 'Transporte',    '#ae1800',  2),
--   (:hid, 'Bares y más',   '#7d7979',  3),
--   (:hid, 'Suscripciones', '#ff563c',  4),
--   (:hid, 'Capricho',      '#444141',  5),
--   (:hid, 'Regalos',       '#ff9783',  6),
--   (:hid, 'Cosas de casa', '#9b9797',  7),
--   (:hid, 'Ropa',          '#4d170e',  8),
--   (:hid, 'Gatetes',       '#c94b39',  9),
--   (:hid, 'Otros',         '#bab6b6', 10);
--
-- insert into accounts (household_id, name, owner_user_id, sort_order) values
--   (:hid, 'Sabadell',   :miguel, 0),
--   (:hid, 'Ruralvia',   :miguel, 1),
--   (:hid, 'Santander',  :mayte,  2),
--   (:hid, 'Revolut',    null,    3);

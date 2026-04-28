create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  date date not null,
  note text not null default '',
  source text not null check (source in ('single', 'installment')),
  installment_group_id uuid,
  installment_index integer,
  installment_total integer,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);

create index if not exists transactions_group_idx
  on public.transactions (installment_group_id);

create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  start_date date not null,
  note text not null default '',
  end_month text,
  created_at timestamptz not null default timezone('utc', now()),
  check (end_month is null or end_month ~ '^\d{4}-\d{2}$')
);

create index if not exists recurring_rules_user_start_idx
  on public.recurring_rules (user_id, start_date desc);

create table if not exists public.account_balances (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_balance numeric(12, 2) not null default 0 check (current_balance >= 0),
  emergency_fund numeric(12, 2) not null default 0 check (emergency_fund >= 0),
  investments numeric(12, 2) not null default 0 check (investments >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.account_balances
  add column if not exists current_balance numeric(12, 2) not null default 0 check (current_balance >= 0);

alter table public.transactions enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.account_balances enable row level security;

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
  on public.transactions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
  on public.transactions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own"
  on public.transactions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own"
  on public.transactions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "recurring_rules_select_own" on public.recurring_rules;
create policy "recurring_rules_select_own"
  on public.recurring_rules
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "recurring_rules_insert_own" on public.recurring_rules;
create policy "recurring_rules_insert_own"
  on public.recurring_rules
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "recurring_rules_update_own" on public.recurring_rules;
create policy "recurring_rules_update_own"
  on public.recurring_rules
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "recurring_rules_delete_own" on public.recurring_rules;
create policy "recurring_rules_delete_own"
  on public.recurring_rules
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "account_balances_select_own" on public.account_balances;
create policy "account_balances_select_own"
  on public.account_balances
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "account_balances_insert_own" on public.account_balances;
create policy "account_balances_insert_own"
  on public.account_balances
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "account_balances_update_own" on public.account_balances;
create policy "account_balances_update_own"
  on public.account_balances
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

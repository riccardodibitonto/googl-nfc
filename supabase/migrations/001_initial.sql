-- Review Cards Manager - initial Supabase schema
-- Execute once in a new Supabase project. Runtime writes use the service-role
-- server endpoints and the transactional functions defined below.

create extension if not exists "pgcrypto";

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  country text not null check (btrim(country) <> ''),
  address text,
  google_place_id text,
  google_review_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_date date not null default current_date,
  quantity integer not null check (quantity > 0),
  total_cost numeric(12,2) not null check (total_cost >= 0),
  order_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  sale_date date not null default current_date,
  quantity integer not null check (quantity > 0),
  total_revenue numeric(12,2) not null check (total_revenue >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  movement_type text not null check (movement_type in ('PURCHASE', 'SALE')),
  quantity integer not null,
  amount numeric(12,2) not null check (amount >= 0),
  purchase_id uuid references public.purchases(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint inventory_movement_source_check check (
    (movement_type = 'PURCHASE'
      and quantity > 0
      and purchase_id is not null
      and sale_id is null
      and client_id is null)
    or
    (movement_type = 'SALE'
      and quantity < 0
      and purchase_id is null
      and sale_id is not null
      and client_id is not null)
  )
);

create unique index if not exists inventory_movements_purchase_uidx
  on public.inventory_movements(purchase_id)
  where purchase_id is not null;
create unique index if not exists inventory_movements_sale_uidx
  on public.inventory_movements(sale_id)
  where sale_id is not null;
create index if not exists clients_name_idx on public.clients(name);
create index if not exists purchases_purchase_date_idx on public.purchases(purchase_date desc);
create index if not exists sales_client_id_idx on public.sales(client_id);
create index if not exists sales_sale_date_idx on public.sales(sale_date desc);
create index if not exists movements_created_at_idx on public.inventory_movements(created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients
for each row execute function public.set_updated_at();
drop trigger if exists purchases_set_updated_at on public.purchases;
create trigger purchases_set_updated_at before update on public.purchases
for each row execute function public.set_updated_at();
drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at before update on public.sales
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
alter table public.purchases enable row level security;
alter table public.sales enable row level security;
alter table public.inventory_movements enable row level security;

-- The app currently accesses the database only through server-side service-role
-- endpoints. No anon/authenticated policies are intentionally added here.

create or replace function public.create_purchase(
  p_quantity integer,
  p_total_cost numeric,
  p_purchase_date date default current_date,
  p_order_reference text default null,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  purchase_row public.purchases;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La quantità deve essere maggiore di zero';
  end if;
  if p_total_cost is null or p_total_cost < 0 then
    raise exception 'Il costo non può essere negativo';
  end if;

  insert into public.purchases(quantity, total_cost, purchase_date, order_reference, notes)
  values (p_quantity, p_total_cost, coalesce(p_purchase_date, current_date), p_order_reference, p_notes)
  returning * into purchase_row;

  insert into public.inventory_movements(movement_type, quantity, amount, purchase_id)
  values ('PURCHASE', p_quantity, p_total_cost, purchase_row.id);

  return to_jsonb(purchase_row);
end;
$$;

create or replace function public.create_sale(
  p_client_id uuid,
  p_quantity integer,
  p_total_revenue numeric,
  p_sale_date date default current_date,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sale_row public.sales;
  available integer;
begin
  -- Serialize inventory checks so concurrent sales cannot oversell.
  perform pg_advisory_xact_lock(hashtextextended('review-cards-inventory', 0));

  if not exists (select 1 from public.clients where id = p_client_id) then
    raise exception 'Cliente non trovato';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La quantità deve essere maggiore di zero';
  end if;
  if p_total_revenue is null or p_total_revenue < 0 then
    raise exception 'Il ricavo non può essere negativo';
  end if;

  select coalesce((select sum(quantity) from public.purchases), 0)
       - coalesce((select sum(quantity) from public.sales), 0)
    into available;
  if p_quantity > available then
    raise exception 'Inventario insufficiente: disponibili %, richieste %', available, p_quantity;
  end if;

  insert into public.sales(client_id, quantity, total_revenue, sale_date, notes)
  values (p_client_id, p_quantity, p_total_revenue, coalesce(p_sale_date, current_date), p_notes)
  returning * into sale_row;

  insert into public.inventory_movements(movement_type, quantity, amount, sale_id, client_id)
  values ('SALE', -p_quantity, p_total_revenue, sale_row.id, p_client_id);

  return to_jsonb(sale_row);
end;
$$;

create or replace function public.delete_sale(p_sale_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  removed public.sales;
begin
  perform pg_advisory_xact_lock(hashtextextended('review-cards-inventory', 0));
  delete from public.inventory_movements where sale_id = p_sale_id;
  delete from public.sales where id = p_sale_id returning * into removed;
  if removed.id is null then
    raise exception 'Vendita non trovata';
  end if;
  return to_jsonb(removed);
end;
$$;

create or replace function public.delete_purchase(p_purchase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  removed public.purchases;
  available_after_delete integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('review-cards-inventory', 0));
  select coalesce(sum(p.quantity), 0) - coalesce((select sum(s.quantity) from public.sales s), 0)
    into available_after_delete
    from public.purchases p
   where p.id <> p_purchase_id;
  if available_after_delete < 0 then
    raise exception 'Acquisto non eliminabile: renderebbe l''inventario negativo';
  end if;

  delete from public.inventory_movements where purchase_id = p_purchase_id;
  delete from public.purchases where id = p_purchase_id returning * into removed;
  if removed.id is null then
    raise exception 'Acquisto non trovato';
  end if;
  return to_jsonb(removed);
end;
$$;

revoke all on function public.create_purchase(integer, numeric, date, text, text) from public;
revoke all on function public.create_sale(uuid, integer, numeric, date, text) from public;
revoke all on function public.delete_sale(uuid) from public;
revoke all on function public.delete_purchase(uuid) from public;
grant execute on function public.create_purchase(integer, numeric, date, text, text) to service_role;
grant execute on function public.create_sale(uuid, integer, numeric, date, text) to service_role;
grant execute on function public.delete_sale(uuid) to service_role;
grant execute on function public.delete_purchase(uuid) to service_role;

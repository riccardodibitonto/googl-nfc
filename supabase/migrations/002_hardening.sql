-- Review Cards Manager - security and transactional hardening
-- Apply after 001_initial.sql. This migration does not recreate tables or delete data.

-- Keep all privileged functions private to the server-side service role.
revoke execute on function public.create_purchase(integer, numeric, date, text, text)
  from public, anon, authenticated;
revoke execute on function public.create_sale(uuid, integer, numeric, date, text)
  from public, anon, authenticated;
revoke execute on function public.delete_purchase(uuid)
  from public, anon, authenticated;
revoke execute on function public.delete_sale(uuid)
  from public, anon, authenticated;

grant execute on function public.create_purchase(integer, numeric, date, text, text)
  to service_role;
grant execute on function public.create_sale(uuid, integer, numeric, date, text)
  to service_role;
grant execute on function public.delete_purchase(uuid)
  to service_role;
grant execute on function public.delete_sale(uuid)
  to service_role;

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

  insert into public.purchases (
    quantity, total_cost, purchase_date, order_reference, notes
  )
  values (
    p_quantity, p_total_cost, coalesce(p_purchase_date, current_date),
    p_order_reference, p_notes
  )
  returning * into purchase_row;

  insert into public.inventory_movements (
    movement_type, quantity, amount, purchase_id, sale_id, client_id
  )
  values ('PURCHASE', p_quantity, p_total_cost, purchase_row.id, null, null);

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
  -- The lock must be acquired before the inventory read/check.
  perform pg_advisory_xact_lock(
    hashtextextended('review-cards-inventory', 0)
  );

  if not exists (
    select 1 from public.clients where public.clients.id = p_client_id
  ) then
    raise exception 'Cliente non trovato';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La quantità deve essere maggiore di zero';
  end if;
  if p_total_revenue is null or p_total_revenue < 0 then
    raise exception 'Il ricavo non può essere negativo';
  end if;

  select
    coalesce((select sum(public.purchases.quantity) from public.purchases), 0)
    - coalesce((select sum(public.sales.quantity) from public.sales), 0)
  into available;

  if p_quantity > available then
    raise exception
      'Inventario insufficiente: disponibili %, richieste %',
      available, p_quantity;
  end if;

  insert into public.sales (
    client_id, quantity, total_revenue, sale_date, notes
  )
  values (
    p_client_id, p_quantity, p_total_revenue,
    coalesce(p_sale_date, current_date), p_notes
  )
  returning * into sale_row;

  insert into public.inventory_movements (
    movement_type, quantity, amount, purchase_id, sale_id, client_id
  )
  values ('SALE', -p_quantity, p_total_revenue, null, sale_row.id, p_client_id);

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
  perform pg_advisory_xact_lock(
    hashtextextended('review-cards-inventory', 0)
  );

  select *
    into removed
    from public.sales
   where public.sales.id = p_sale_id
   for update;

  if removed.id is null then
    raise exception 'Vendita non trovata';
  end if;

  delete from public.inventory_movements
   where public.inventory_movements.sale_id = p_sale_id;
  delete from public.sales
   where public.sales.id = p_sale_id;

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
  perform pg_advisory_xact_lock(
    hashtextextended('review-cards-inventory', 0)
  );

  select *
    into removed
    from public.purchases
   where public.purchases.id = p_purchase_id
   for update;

  if removed.id is null then
    raise exception 'Acquisto non trovato';
  end if;

  select
    coalesce((
      select sum(public.purchases.quantity)
        from public.purchases
       where public.purchases.id <> p_purchase_id
    ), 0)
    - coalesce((select sum(public.sales.quantity) from public.sales), 0)
  into available_after_delete;

  if available_after_delete < 0 then
    raise exception
      'Acquisto non eliminabile: renderebbe l''inventario negativo';
  end if;

  delete from public.inventory_movements
   where public.inventory_movements.purchase_id = p_purchase_id;
  delete from public.purchases
   where public.purchases.id = p_purchase_id;

  return to_jsonb(removed);
end;
$$;

-- CREATE OR REPLACE preserves the function signatures, so re-apply the
-- privileges explicitly after replacing the function bodies.
revoke execute on function public.create_purchase(integer, numeric, date, text, text)
  from public, anon, authenticated;
revoke execute on function public.create_sale(uuid, integer, numeric, date, text)
  from public, anon, authenticated;
revoke execute on function public.delete_purchase(uuid)
  from public, anon, authenticated;
revoke execute on function public.delete_sale(uuid)
  from public, anon, authenticated;

grant execute on function public.create_purchase(integer, numeric, date, text, text)
  to service_role;
grant execute on function public.create_sale(uuid, integer, numeric, date, text)
  to service_role;
grant execute on function public.delete_purchase(uuid)
  to service_role;
grant execute on function public.delete_sale(uuid)
  to service_role;

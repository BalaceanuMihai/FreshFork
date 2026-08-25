-- Renaming a table does not rename its indexes or constraints.
--
-- The previous migration moved the retired ordering tables aside, but they
-- were still holding names the replacement needs — orders_pkey,
-- orders_customer_idx, reviews_order_id_key and a dozen more. Creating the new
-- schema failed on the first collision.
--
-- Suffix every index and constraint on the retired tables. Constraints are
-- renamed first, because renaming a constraint also renames its backing index.

do $$
declare r record;
begin
  for r in
    select t.relname as tbl, con.conname
    from pg_constraint con
    join pg_class t on t.oid = con.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname like '%\_legacy\_20260823'
  loop
    execute format(
      'alter table public.%I rename constraint %I to %I',
      r.tbl, r.conname, left(r.conname || '_lg23', 63)
    );
  end loop;
end $$;

do $$
declare r record;
begin
  for r in
    select c.relname as idx
    from pg_class c
    join pg_index i on i.indexrelid = c.oid
    join pg_class t on t.oid = i.indrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and t.relname like '%\_legacy\_20260823'
      and c.relname not like '%\_lg23'
  loop
    execute format('alter index public.%I rename to %I', r.idx, left(r.idx || '_lg23', 63));
  end loop;
end $$;

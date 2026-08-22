-- security definer changes the executing ROLE but not auth.uid(), which still
-- reads the caller's JWT. So submit_vendor_for_review's UPDATE was being
-- reverted by vendors_guard_update like any other vendor-initiated write.
--
-- Fix: a transaction-local flag that only trusted security-definer functions
-- set. It cannot be forged from PostgREST — set_config is not exposed there,
-- and the flag is reset at transaction end.

create or replace function public.vendors_guard_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  acting_uid uuid := auth.uid();
  acting_is_admin boolean := acting_uid is not null and public.is_admin();
  status_write_allowed boolean :=
    coalesce(current_setting('freshfork.allow_status_write', true), '') = 'on';
begin
  -- acting_uid is null for the service role (webhooks, admin client).
  if acting_uid is not null and not acting_is_admin and not status_write_allowed then
    new.status := old.status;
    new.status_note := old.status_note;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.verified_since := old.verified_since;
  end if;

  -- Stripe state is authoritative from the webhook only — not even an admin
  -- edits it by hand, and certainly not the vendor.
  if acting_uid is not null then
    new.stripe_account_id := old.stripe_account_id;
    new.stripe_connect_status := old.stripe_connect_status;
    new.stripe_charges_enabled := old.stripe_charges_enabled;
    new.stripe_payouts_enabled := old.stripe_payouts_enabled;
  end if;

  -- is_live is always derived, for everyone.
  new.is_live := (new.status = 'approved' and new.stripe_connect_status = 'complete');
  if new.is_live and new.verified_since is null then
    new.verified_since := current_date;
  end if;

  new.profile_id := old.profile_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.vendors_guard_update() from public, anon, authenticated;

create or replace function public.submit_vendor_for_review(p_vendor_id uuid)
returns public.vendor_status
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v public.vendors;
begin
  select * into v from public.vendors where id = p_vendor_id;

  if v.id is null then
    raise exception 'Vendor not found.' using errcode = 'no_data_found';
  end if;

  if v.profile_id <> auth.uid() and not public.is_admin() then
    raise exception 'Not your vendor listing.' using errcode = 'insufficient_privilege';
  end if;

  if v.status not in ('draft', 'changes_requested') then
    raise exception 'This listing is already % and cannot be resubmitted.', v.status
      using errcode = 'invalid_parameter_value';
  end if;

  -- Everything the admin reviewer needs in order to make a decision.
  if coalesce(trim(v.business_name), '') = '' then
    raise exception 'Add your business name before submitting.' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(trim(v.cuisine), '') = '' then
    raise exception 'Add your cuisine before submitting.' using errcode = 'invalid_parameter_value';
  end if;
  if v.location is null then
    raise exception 'Add your pickup address before submitting.' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(trim(v.cert_doc_path), '') = '' then
    raise exception 'Upload your food-handler certification before submitting.'
      using errcode = 'invalid_parameter_value';
  end if;

  perform set_config('freshfork.allow_status_write', 'on', true);

  update public.vendors
  set status = 'pending_review',
      status_note = null,
      onboarding_step = 'review'
  where id = p_vendor_id;

  perform set_config('freshfork.allow_status_write', 'off', true);

  return 'pending_review'::public.vendor_status;
end;
$$;

revoke all on function public.submit_vendor_for_review(uuid) from public, anon;
grant execute on function public.submit_vendor_for_review(uuid) to authenticated;

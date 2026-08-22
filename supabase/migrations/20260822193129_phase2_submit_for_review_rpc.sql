-- The guard trigger blocks vendors from writing `status` at all. This is the one
-- narrow, validated transition they are allowed to make: draft or
-- changes_requested -> pending_review, on their own vendor row.
-- NOTE: superseded by 20260822193156_phase2_status_write_escape_hatch.sql, which
-- adds the transaction-local flag this UPDATE needs to survive the guard trigger.

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

  update public.vendors
  set status = 'pending_review',
      status_note = null,
      onboarding_step = 'review'
  where id = p_vendor_id;

  return 'pending_review'::public.vendor_status;
end;
$$;

revoke all on function public.submit_vendor_for_review(uuid) from public, anon;
grant execute on function public.submit_vendor_for_review(uuid) to authenticated;

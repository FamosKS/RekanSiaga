create table if not exists public.report_status_audit_logs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.public_reports(id),
  previous_status text not null,
  new_status text not null,
  actor_staff_id uuid not null references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists report_status_audit_logs_report_created_idx
  on public.report_status_audit_logs (report_id, created_at desc);

alter table public.report_status_audit_logs enable row level security;

revoke all on table public.report_status_audit_logs from anon, authenticated;

create or replace function public.update_public_report_status(
  p_report_id uuid,
  p_new_status text,
  p_note text default null
)
returns setof public.public_reports
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_previous_status text;
  v_report public.public_reports;
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_new_status not in ('under_review', 'approved', 'resolved') then
    raise exception 'Unsupported report status: %', p_new_status;
  end if;

  if not exists (
    select 1
    from public.staff_profiles sp
    join public.staff_role_assignments sra on sra.staff_id = sp.user_id
    join public.roles r on r.id = sra.role_id
    where sp.user_id = v_actor_id
      and sp.is_active is true
      and r.code = 'super_admin'
  ) then
    raise exception 'Active super_admin role is required';
  end if;

  select pr.status
    into v_previous_status
    from public.public_reports pr
    where pr.id = p_report_id
    for update;

  if not found then
    raise exception 'Report not found';
  end if;

  if v_previous_status = p_new_status then
    raise exception 'Report already has status %', p_new_status;
  end if;

  update public.public_reports
    set status = p_new_status,
        updated_at = now()
    where id = p_report_id
    returning * into v_report;

  insert into public.report_status_audit_logs (
    report_id,
    previous_status,
    new_status,
    actor_staff_id,
    note
  ) values (
    p_report_id,
    v_previous_status,
    p_new_status,
    v_actor_id,
    nullif(btrim(p_note), '')
  );

  return next v_report;
end;
$$;

revoke all on function public.update_public_report_status(uuid, text, text)
  from public, anon;
grant execute on function public.update_public_report_status(uuid, text, text)
  to authenticated;

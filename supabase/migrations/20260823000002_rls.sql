-- Peace Circle — Row-Level Security.
--
-- The access gate. Authenticating with a magic link proves only that someone
-- owns an email address; it grants nothing. Reading member content requires an
-- `approved` profile, enforced here so a poked API call or a hidden UI element
-- cannot leak the circle's contents.
--
-- Postgres is default-deny once RLS is enabled: with no matching policy, a
-- table returns zero rows rather than erroring. Every grant below is therefore
-- deliberate and additive.

alter table public.profiles      enable row level security;
alter table public.admin_emails  enable row level security;
alter table public.inquiries     enable row level security;
alter table public.launch_codes  enable row level security;
alter table public.resources     enable row level security;
alter table public.comments      enable row level security;
alter table public.messages      enable row level security;
alter table public.events        enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- You can always read your own row, approved or not — that is how /pending
-- knows to tell an un-approved visitor they are not on the roster yet.
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

-- Approved members see each other (author names and avatars).
create policy profiles_select_members on public.profiles
  for select to authenticated
  using (public.is_approved());

-- Members may edit their own row. The status/is_admin columns are protected by
-- a trigger below, since RLS cannot restrict individual columns.
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Deliberately no INSERT policy: profiles are created only by the bootstrap
-- trigger, by `redeem_launch_code()` — a security definer function, added in
-- its own migration — or by the invite flow, which runs server-side with the
-- secret key.

-- Stop a member from promoting themselves by PATCHing their own profile.
--
-- Triggers fire for every caller, including ones that bypass RLS, so this must
-- name the trusted roles explicitly. The invite, revoke, and reinstate routes
-- run server-side with the secret key: there is no end user in the request, so
-- auth.uid() is null and is_admin() is false. Without the first branch this
-- guard would silently revert those writes and report success.
--
-- SECURITY INVOKER (not DEFINER) is what makes current_user the calling role
-- rather than this function's owner. Nothing here touches a table, so the
-- elevated rights were never needed; is_admin() does its own RLS-breaking.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  new.status  := old.status;
  new.is_admin := old.is_admin;
  return new;
end;
$$;

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- admin_emails — never client-readable
-- ---------------------------------------------------------------------------

create policy admin_emails_admin_all on public.admin_emails
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- inquiries — the one anon-writable path, and it is write-only
-- ---------------------------------------------------------------------------

-- Anyone may submit the public interest form, but only as a fresh inquiry:
-- pinning status/handled_by/notes stops a submitter from posting themselves in
-- as already-invited or writing admin notes.
create policy inquiries_insert_public on public.inquiries
  for insert to anon, authenticated
  with check (
    status = 'new'
    and handled_by is null
    and notes is null
  );

create policy inquiries_admin_read on public.inquiries
  for select to authenticated
  using (public.is_admin());

create policy inquiries_admin_write on public.inquiries
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy inquiries_admin_delete on public.inquiries
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- launch_codes — admin-only; redemption is a security definer function
-- ---------------------------------------------------------------------------

create policy launch_codes_admin_all on public.launch_codes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- resources
-- ---------------------------------------------------------------------------

create policy resources_select_members on public.resources
  for select to authenticated
  using (public.is_approved());

-- You may only post as yourself.
create policy resources_insert_own on public.resources
  for insert to authenticated
  with check (public.is_approved() and author_id = (select auth.uid()));

create policy resources_update_own on public.resources
  for update to authenticated
  using (public.is_approved() and author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy resources_delete_own_or_admin on public.resources
  for delete to authenticated
  using (
    public.is_admin()
    or (public.is_approved() and author_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------

create policy comments_select_members on public.comments
  for select to authenticated
  using (public.is_approved());

create policy comments_insert_own on public.comments
  for insert to authenticated
  with check (public.is_approved() and author_id = (select auth.uid()));

create policy comments_update_own on public.comments
  for update to authenticated
  using (public.is_approved() and author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy comments_delete_own_or_admin on public.comments
  for delete to authenticated
  using (
    public.is_admin()
    or (public.is_approved() and author_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- messages — The Circle group chat
-- ---------------------------------------------------------------------------

create policy messages_select_members on public.messages
  for select to authenticated
  using (public.is_approved());

create policy messages_insert_own on public.messages
  for insert to authenticated
  with check (public.is_approved() and author_id = (select auth.uid()));

-- Chat messages are not editable; you may retract your own, and admins may
-- moderate any.
create policy messages_delete_own_or_admin on public.messages
  for delete to authenticated
  using (
    public.is_admin()
    or (public.is_approved() and author_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- events — members read, admins manage
-- ---------------------------------------------------------------------------

create policy events_select_members on public.events
  for select to authenticated
  using (public.is_approved());

create policy events_admin_write on public.events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

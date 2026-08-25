-- Peace Circle — RLS gate tests.
--
-- The security model in one file. PLAN.md calls the access gate
-- non-negotiable: a user without an approved profile must read nothing
-- member-facing, enforced by the database rather than the UI. These tests are
-- what makes that claim checkable instead of aspirational.
--
-- Run with: supabase test db

begin;
select plan(36);

-- Seeded fixtures (see supabase/seed.sql).
--   1111… Lisa  — approved admin
--   2222… Ruth  — approved member
-- Plus one un-approved auth user created below.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  '99999999-9999-9999-9999-999999999999',
  'authenticated', 'authenticated', 'stranger@example.com', '',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}'
);

-- ===========================================================================
-- 1. Anonymous visitors read nothing member-facing.
-- ===========================================================================

set local role anon;
set local request.jwt.claims = '';

select is((select count(*) from public.resources), 0::bigint,
  'anon reads no resources');
select is((select count(*) from public.messages), 0::bigint,
  'anon reads no messages');
select is((select count(*) from public.comments), 0::bigint,
  'anon reads no comments');
select is((select count(*) from public.events), 0::bigint,
  'anon reads no events');
select is((select count(*) from public.profiles), 0::bigint,
  'anon reads no profiles');
select is((select count(*) from public.inquiries), 0::bigint,
  'anon reads no inquiries');
select is((select count(*) from public.launch_codes), 0::bigint,
  'anon reads no launch codes');
select is((select count(*) from public.admin_emails), 0::bigint,
  'anon reads no admin emails');

-- ===========================================================================
-- 2. The interest form is the one anon-writable path, and it is write-only.
-- ===========================================================================

select lives_ok(
  $$insert into public.inquiries (name, email, heard_from)
    values ('Anon Visitor', 'anon@example.com', 'Walked past the church')$$,
  'anon may submit the public interest form'
);

-- Submitting yourself as already-invited must be rejected.
select throws_ok(
  $$insert into public.inquiries (name, email, heard_from, status)
    values ('Sneaky', 'sneaky@example.com', 'nowhere', 'invited')$$,
  '42501',
  null,
  'anon cannot submit an inquiry with a non-new status'
);

select throws_ok(
  $$insert into public.inquiries (name, email, heard_from, notes)
    values ('Sneaky', 'sneaky@example.com', 'nowhere', 'admin note')$$,
  '42501',
  null,
  'anon cannot write admin notes onto an inquiry'
);

reset role;

-- ===========================================================================
-- 3. Authenticated but un-approved — the stranger who guessed /signin.
--    Authentication alone must grant nothing.
-- ===========================================================================

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';

select is((select count(*) from public.resources), 0::bigint,
  'un-approved user reads no resources');
select is((select count(*) from public.messages), 0::bigint,
  'un-approved user reads no messages');
select is((select count(*) from public.comments), 0::bigint,
  'un-approved user reads no comments');
select is((select count(*) from public.events), 0::bigint,
  'un-approved user reads no events');
select is((select count(*) from public.profiles), 0::bigint,
  'un-approved user reads no profiles (they have none of their own)');

-- They cannot smuggle themselves in by writing a share.
select throws_ok(
  $$insert into public.resources (author_id, kind, quote)
    values ('99999999-9999-9999-9999-999999999999', 'quote', 'let me in')$$,
  '42501',
  null,
  'un-approved user cannot post a resource'
);

reset role;

-- ===========================================================================
-- 4. An approved member sees the circle.
-- ===========================================================================

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select ok((select count(*) from public.resources) > 0,
  'approved member reads resources');
select ok((select count(*) from public.messages) > 0,
  'approved member reads messages');
select ok((select count(*) from public.events) > 0,
  'approved member reads events');

-- Members must not see the vetting queue; that is admin-only.
select is((select count(*) from public.inquiries), 0::bigint,
  'approved non-admin member reads no inquiries');

-- Posting as somebody else must fail.
select throws_ok(
  $$insert into public.resources (author_id, kind, quote)
    values ('11111111-1111-1111-1111-111111111111', 'quote', 'not mine')$$,
  '42501',
  null,
  'member cannot post a resource attributed to another member'
);

-- Self-promotion must be silently neutralised by the guard trigger.
update public.profiles set is_admin = true
  where id = '22222222-2222-2222-2222-222222222222';

select is(
  (select is_admin from public.profiles
     where id = '22222222-2222-2222-2222-222222222222'),
  false,
  'member cannot promote themselves to admin'
);

reset role;

-- ===========================================================================
-- 5. Revocation closes every door, without deleting the person.
--    Deleting a profile would cascade away their resources, comments, and
--    messages; revoking leaves all of it intact.
-- ===========================================================================

-- An admin revokes Ruth.
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

update public.profiles set status = 'revoked'
  where id = '22222222-2222-2222-2222-222222222222';

select is(
  (select status from public.profiles
     where id = '22222222-2222-2222-2222-222222222222'),
  'revoked'::public.profile_status,
  'an admin can revoke a member'
);

-- Her contributions survive the revocation.
select ok(
  (select count(*) from public.messages
     where author_id = '22222222-2222-2222-2222-222222222222') > 0,
  'a revoked member''s messages are preserved, not deleted'
);

-- But she is now locked out everywhere.
set local request.jwt.claims =
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is((select count(*) from public.resources), 0::bigint,
  'revoked member reads no resources');
select is((select count(*) from public.messages), 0::bigint,
  'revoked member reads no messages');
select is((select count(*) from public.events), 0::bigint,
  'revoked member reads no events');

select throws_ok(
  $$insert into public.messages (author_id, body)
    values ('22222222-2222-2222-2222-222222222222', 'still here?')$$,
  '42501',
  null,
  'revoked member cannot post to the chat'
);

reset role;

-- ===========================================================================
-- 6. The admin bootstrap: an allowlisted email gets an admin profile on first
--    sign-in, with the label the allowlist specifies rather than a hardcoded
--    one. Everyone else falls through with no profile at all.
-- ===========================================================================

insert into public.admin_emails (email, role)
values ('second.admin@example.com', 'Steward');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  '77777777-7777-7777-7777-777777777777',
  'authenticated', 'authenticated', 'second.admin@example.com', '',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{"name":"Second Admin"}'
);

select is(
  (select is_admin from public.profiles
     where id = '77777777-7777-7777-7777-777777777777'),
  true,
  'an allowlisted email is bootstrapped as an admin on first sign-in'
);

select is(
  (select role from public.profiles
     where id = '77777777-7777-7777-7777-777777777777'),
  'Steward',
  'the bootstrapped role comes from the allowlist, not a hardcoded title'
);

select is(
  (select name from public.profiles
     where id = '77777777-7777-7777-7777-777777777777'),
  'Second Admin',
  'the bootstrapped name comes from the signup metadata'
);

-- The stranger from section 3 signed in but is not allowlisted, so the trigger
-- must have left them with no profile.
select is(
  (select count(*) from public.profiles
     where id = '99999999-9999-9999-9999-999999999999'),
  0::bigint,
  'a non-allowlisted signup gets no profile'
);

-- ===========================================================================
-- 7. The secret key must still be able to manage privileges.
--    Invite, revoke, and reinstate run server-side: there is no end user in
--    the request, so auth.uid() is null and is_admin() is false. The guard
--    trigger fires for these callers too — RLS is bypassed by the secret key,
--    triggers are not — so it must let them through. It failed silently
--    before, since the UPDATE reports success either way.
-- ===========================================================================

set local role service_role;

update public.profiles set status = 'approved'
  where id = '22222222-2222-2222-2222-222222222222';

select is(
  (select status from public.profiles
     where id = '22222222-2222-2222-2222-222222222222'),
  'approved'::public.profile_status,
  'the service role can reinstate a revoked member'
);

reset role;

-- And the guard still holds for everyone else. Section 4 asserts this against
-- an approved member; repeated here because the fix changed the function from
-- SECURITY DEFINER to INVOKER, which is what current_user above depends on.
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

update public.profiles set is_admin = true
  where id = '22222222-2222-2222-2222-222222222222';

select is(
  (select is_admin from public.profiles
     where id = '22222222-2222-2222-2222-222222222222'),
  false,
  'a reinstated member still cannot promote themselves'
);

reset role;

set local role service_role;

update public.profiles set is_admin = true
  where id = '22222222-2222-2222-2222-222222222222';

select is(
  (select is_admin from public.profiles
     where id = '22222222-2222-2222-2222-222222222222'),
  true,
  'the service role can grant admin'
);

reset role;

select * from finish();
rollback;

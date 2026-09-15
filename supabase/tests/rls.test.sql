-- Peace Circle — RLS gate tests.
--
-- The security model in one file. PLAN.md calls the access gate
-- non-negotiable: a user without an approved profile must read nothing
-- member-facing, enforced by the database rather than the UI. These tests are
-- what makes that claim checkable instead of aspirational.
--
-- Run with: supabase test db

begin;
select plan(71);

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

-- The length ceilings on the one table anyone on the internet may write to.
-- Each is tested at the limit and one character past it, which pins the number
-- exactly: raising a ceiling in the migration without changing this file fails
-- the "one over is refused" case, and lowering one fails the "at the limit is
-- accepted" case.
--
-- These numbers are also written down in INQUIRY_LIMITS in lib/inquiries.ts,
-- and nothing checks the two against each other. That is deliberate for now:
-- a real check has to ask the database what it enforces, which would make
-- `npm test` depend on the local stack, and PLAN.md's end-to-end tests will
-- run against the database anyway. Until then, a drift that lets the form
-- accept more than the column allows shows up as a logged insert failure in
-- app/actions/inquiries.ts, naming the constraint. This half is the one that
-- decides what actually reaches the column, so it is the half worth pinning
-- first.

select lives_ok(
  $$insert into public.inquiries (name, email, heard_from)
    values (repeat('x', 100), 'atlimit@example.com', 'ok')$$,
  'a 100-character name is accepted'
);
select throws_ok(
  $$insert into public.inquiries (name, email, heard_from)
    values (repeat('x', 101), 'toolong@example.com', 'ok')$$,
  '23514',
  null,
  'a 101-character name is refused'
);

select lives_ok(
  $$insert into public.inquiries (name, email, heard_from)
    values ('At Limit', repeat('e', 242) || '@example.com', 'ok')$$,
  'a 254-character email address is accepted'
);
select throws_ok(
  $$insert into public.inquiries (name, email, heard_from)
    values ('Too Long', repeat('e', 243) || '@example.com', 'ok')$$,
  '23514',
  null,
  'a 255-character email address is refused'
);

select lives_ok(
  $$insert into public.inquiries (name, email, heard_from)
    values ('At Limit', 'heard@example.com', repeat('x', 1000))$$,
  'a 1000-character "how did you hear" is accepted'
);
select throws_ok(
  $$insert into public.inquiries (name, email, heard_from)
    values ('Too Long', 'heard@example.com', repeat('x', 1001))$$,
  '23514',
  null,
  'a 1001-character "how did you hear" is refused'
);

select lives_ok(
  $$insert into public.inquiries (name, email, heard_from, referred_by)
    values ('At Limit', 'ref@example.com', 'ok', repeat('x', 100))$$,
  'a 100-character referral is accepted'
);
select throws_ok(
  $$insert into public.inquiries (name, email, heard_from, referred_by)
    values ('Too Long', 'ref@example.com', 'ok', repeat('x', 101))$$,
  '23514',
  null,
  'a 101-character referral is refused'
);

select lives_ok(
  $$insert into public.inquiries (name, email, heard_from, message)
    values ('At Limit', 'msg@example.com', 'ok', repeat('x', 2000))$$,
  'a 2000-character message is accepted'
);
select throws_ok(
  $$insert into public.inquiries (name, email, heard_from, message)
    values ('Too Long', 'msg@example.com', 'ok', repeat('x', 2001))$$,
  '23514',
  null,
  'a 2001-character message is refused'
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

-- ===========================================================================
-- 8. Launch-code redemption.
--    The only sanctioned path that creates a profile for an ordinary person,
--    so it holds privileges nobody else in this file has: it writes to
--    `profiles`, which has no insert policy at all, and to `launch_codes`,
--    which is admin-only. These tests are the boundary on that privilege —
--    what it must refuse, and what it must never mint.
-- ===========================================================================

insert into public.launch_codes (code, expires_at, max_uses)
values
  ('CIRCLE-LAUNCH',  now() + interval '30 days', 3),
  ('CIRCLE-EXPIRED', now() - interval '1 day',   null),
  ('CIRCLE-FULL',    now() + interval '30 days', 1);

-- The last seat on CIRCLE-FULL is already spent.
update public.launch_codes set uses = 1 where code = 'CIRCLE-FULL';

-- Three people holding a code. None is allowlisted, so the bootstrap trigger
-- leaves them profile-less exactly as a real cohort member would be.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'authenticated', 'authenticated', 'cohort@example.com', '',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Cohort Member"}'),
  ('00000000-0000-0000-0000-000000000000',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'authenticated', 'authenticated', 'toolate@example.com', '',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Too Late"}'),
  ('00000000-0000-0000-0000-000000000000',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'authenticated', 'authenticated', 'noseat@example.com', '',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"No Seat"}');

-- An anonymous visitor cannot reach the function at all. Redemption requires
-- a session, because it is the session that says whose profile to create.
set local role anon;
set local request.jwt.claims = '';

select throws_ok(
  $$select public.redeem_launch_code('CIRCLE-LAUNCH')$$,
  '42501',
  null,
  'anon cannot execute redeem_launch_code'
);

reset role;

-- ---------------------------------------------------------------------------
-- The happy path.
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

-- Lower case and padded, as it arrives from someone retyping a code read out
-- at a meeting or pasting it with a trailing space.
select is(
  public.redeem_launch_code('  circle-launch  '),
  'redeemed'::public.launch_code_outcome,
  'a valid code is redeemed, case- and whitespace-insensitively'
);

reset role;

select is(
  (select status from public.profiles
     where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'approved'::public.profile_status,
  'redemption creates an approved profile'
);

-- The point of the whole function. A launch code is distributed to a cohort
-- and may be forwarded; it must never be able to produce an admin.
select is(
  (select is_admin from public.profiles
     where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  false,
  'redemption creates a NON-admin profile'
);

-- The function takes a code and nothing else, so `role` cannot be chosen by
-- the caller either — it is a literal in the insert.
select is(
  (select role from public.profiles
     where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Member',
  'redemption cannot choose its own role label'
);

select is(
  (select name from public.profiles
     where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Cohort Member',
  'the new profile takes its name from the signup metadata'
);

select is(
  (select uses from public.launch_codes where code = 'CIRCLE-LAUNCH'),
  1,
  'a successful redemption spends exactly one seat'
);

-- ---------------------------------------------------------------------------
-- Redeeming twice is a no-op, not a second seat. Someone double-clicking, or
-- re-opening the link from their inbox, must not burn a seat they already hold.
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select is(
  public.redeem_launch_code('CIRCLE-LAUNCH'),
  'already_member'::public.launch_code_outcome,
  'redeeming again reports already_member rather than failing'
);

-- Being approved does not open the code table. Redemption grants membership,
-- not visibility into how many seats are left or who else used them.
select is(
  (select count(*) from public.launch_codes),
  0::bigint,
  'a redeemed member still reads no launch codes'
);

select is(
  public.redeem_launch_code('NO-SUCH-CODE'),
  'not_found'::public.launch_code_outcome,
  'an unrecognised code reports not_found'
);

reset role;

select is(
  (select uses from public.launch_codes where code = 'CIRCLE-LAUNCH'),
  1,
  'a repeat redemption does not spend a second seat'
);

-- ---------------------------------------------------------------------------
-- An expired code is refused. This is what lets the launch window close.
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select is(
  public.redeem_launch_code('CIRCLE-EXPIRED'),
  'expired'::public.launch_code_outcome,
  'an expired code is refused'
);

reset role;

select is(
  (select count(*) from public.profiles
     where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0::bigint,
  'a refused expired code creates no profile'
);

-- ---------------------------------------------------------------------------
-- A code at its cap is refused. This is what bounds a forwarded code.
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';

select is(
  public.redeem_launch_code('CIRCLE-FULL'),
  'exhausted'::public.launch_code_outcome,
  'a code at its max_uses is refused'
);

reset role;

select is(
  (select count(*) from public.profiles
     where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  0::bigint,
  'a refused exhausted code creates no profile'
);

select is(
  (select uses from public.launch_codes where code = 'CIRCLE-FULL'),
  1,
  'a refused redemption does not push uses past max_uses'
);

-- ---------------------------------------------------------------------------
-- A revoked member cannot let themselves back in with a code. Revocation is
-- the only way to remove someone (deleting a profile would cascade away
-- everything they ever wrote), so a code must not undo it.
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'authenticated', 'authenticated', 'formermember@example.com', '',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{"name":"Former Member"}'
);

insert into public.profiles (id, name, status)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Former Member', 'revoked');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';

select is(
  public.redeem_launch_code('CIRCLE-LAUNCH'),
  'revoked'::public.launch_code_outcome,
  'a revoked member cannot redeem their way back in'
);

reset role;

select is(
  (select status from public.profiles
     where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'revoked'::public.profile_status,
  'a refused redemption leaves a revoked profile revoked'
);

-- ---------------------------------------------------------------------------
-- What a member may write to their own profile, and what the two writers that
-- are not forms do with a name they did not validate.
-- ---------------------------------------------------------------------------

-- Signup metadata is whatever the browser sent to the auth server, and the
-- auth endpoint is public — no client-side rule constrains it. A 250-character
-- name must therefore not be able to turn a redemption into a database error.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'authenticated', 'authenticated', 'longname@example.com', '',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('name', repeat('n', 250))
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","role":"authenticated"}';

select is(
  public.redeem_launch_code('CIRCLE-LAUNCH'),
  'redeemed'::public.launch_code_outcome,
  'an over-long signup name does not break redemption'
);

reset role;

select is(
  (select char_length(name) from public.profiles
     where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  100,
  'the name is clamped to the column ceiling rather than refused'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$update public.profiles set avatar_tint = '#6b7355'
      where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'a member may set a hex avatar tint'
);

-- avatar_tint is interpolated into a CSS `background`. `url(...)` is a legal
-- background value, so an unconstrained column here would let one member make
-- every other member's browser fetch a URL of their choosing.
select throws_ok(
  $$update public.profiles
      set avatar_tint = 'url(https://example.com/beacon.png)'
      where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '23514',
  null,
  'a member cannot put anything but a hex colour in avatar_tint'
);

select throws_ok(
  $$update public.profiles set name = repeat('x', 101)
      where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '23514',
  null,
  'a member cannot set an unbounded display name'
);

reset role;

-- The argument list is itself part of the security boundary: there is exactly
-- one signature, taking one code, so no call can name a role, a status, or an
-- is_admin. A second overload with more parameters would defeat every
-- assertion above, and would not otherwise fail anything.
select is(
  (select count(*)
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'redeem_launch_code'),
  1::bigint,
  'redeem_launch_code has exactly one signature'
);

select is(
  (select pg_catalog.pg_get_function_identity_arguments(p.oid)
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'redeem_launch_code'),
  'p_code text',
  'redeem_launch_code takes a code and nothing else'
);

select * from finish();
rollback;

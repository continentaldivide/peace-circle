-- Peace Circle — bounds on the two profile columns a member writes themselves.
--
-- The finish-profile step on /welcome is the first screen that writes to
-- `profiles`, through the `profiles_update_self` policy. Both columns it
-- touches were unbounded `text`.
--
-- `name` is the smaller problem: it renders on every share, comment, and chat
-- line, so an unbounded one is a way to make a mess of the Library. 100
-- characters matches INQUIRY_LIMITS.name, so the name someone gives on the
-- interest form still fits when they later become a member.
--
-- `avatar_tint` is the one worth stating plainly. It is interpolated straight
-- into a CSS `background` in components/avatar.tsx. React's style object
-- cannot break out of that property, so this is not a route to arbitrary CSS
-- — but `url(...)` is a perfectly legal background value, so without this an
-- unbounded string here would let one member make every other member's browser
-- fetch a URL of their choosing, every time the Library renders. A six-digit
-- lowercase hex colour is the only thing this column was ever meant to hold,
-- and now the only thing it can.
--
-- The existing rows already satisfy both: the seeded tints are lowercase hex
-- and the longest seeded name is 12 characters.

alter table public.profiles
  add constraint profiles_name_length
    check (char_length(btrim(name)) between 1 and 100),
  add constraint profiles_avatar_tint_hex
    check (avatar_tint is null or avatar_tint ~ '^#[0-9a-f]{6}$');

-- ---------------------------------------------------------------------------
-- The two writers that do not go through a form have to respect the ceiling
-- ---------------------------------------------------------------------------

-- Both of these take a name from `raw_user_meta_data`, which is whatever the
-- browser sent to the auth server when the account was created. That is not
-- our form's output and cannot be made to be: the auth endpoint is public and
-- takes the publishable key, so anyone can sign up with any metadata they like,
-- whatever our client-side validation says.
--
-- So the name arriving here is untrusted and may be any length. Left alone,
-- the new constraint would turn that into a failed INSERT — which in the
-- trigger's case means a failed *signup*, and in the redemption's case means a
-- database error where a member should have been created. Clamping is the
-- right answer for both: the name is a display label the person can correct on
-- the finish-profile step, not something worth refusing an account over.

create or replace function public.bootstrap_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowlisted public.admin_emails;
begin
  select * into allowlisted
  from public.admin_emails
  where email = lower(new.email);

  if not found then
    return new;
  end if;

  insert into public.profiles (id, name, role, status, is_admin)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
        split_part(new.email, '@', 1)
      ),
      100
    ),
    allowlisted.role,
    'approved',
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.redeem_launch_code(p_code text)
returns public.launch_code_outcome
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_code public.launch_codes;
  v_status public.profile_status;
  v_name text;
  v_inserted uuid;
begin
  -- Unreachable through the API — execute is granted to `authenticated` only —
  -- but an assertion rather than a silent no-op if that grant ever slips.
  if v_user is null then
    raise exception 'redeem_launch_code requires an authenticated caller'
      using errcode = '28000';
  end if;

  -- The lock comes first, before anything else is read, and is held to commit.
  -- Everything below therefore happens with this code's row to ourselves:
  -- concurrent redemptions of the same code queue here and take their turn.
  select * into v_code
  from public.launch_codes
  where code = upper(btrim(p_code))
  for update;

  if not found then
    return 'not_found';
  end if;

  -- Checked while holding the lock, so a second call from the same person —
  -- an impatient double-submit — finds the profile the first one committed
  -- and returns here, rather than racing it to a duplicate-key error.
  select status into v_status
  from public.profiles
  where id = v_user;

  if found then
    if v_status = 'approved' then
      return 'already_member';
    end if;
    return 'revoked';
  end if;

  if v_code.expires_at <= now() then
    return 'expired';
  end if;

  if v_code.max_uses is not null and v_code.uses >= v_code.max_uses then
    return 'exhausted';
  end if;

  -- The display name the visitor typed before requesting their magic link,
  -- which `signInWithOtp`'s `data` put into the signup metadata. Clamped
  -- rather than rejected: see the note above. The finish-profile step lets
  -- them correct it, so the fallback only has to be reasonable, not right.
  select left(
           coalesce(
             nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
             split_part(u.email, '@', 1)
           ),
           100
         )
  into v_name
  from auth.users u
  where u.id = v_user;

  -- Every privileged column is a literal. This is the line that makes the
  -- elevated rights safe to hand out: there is no input that reaches it.
  insert into public.profiles (id, name, role, status, is_admin)
  values (v_user, coalesce(nullif(v_name, ''), 'Friend'), 'Member', 'approved', false)
  on conflict (id) do nothing
  returning id into v_inserted;

  -- Nothing inserted means a profile appeared between the check above and
  -- here, which only a second redemption of a *different* code by the same
  -- person could do. Return before the increment: a seat is spent only when
  -- this call is the one that created the member.
  if v_inserted is null then
    return 'already_member';
  end if;

  update public.launch_codes
  set uses = uses + 1
  where code = v_code.code;

  return 'redeemed';
end;
$$;

-- Peace Circle — launch-code redemption.
--
-- The launch cohort's way in: someone signs in with a magic link, and this
-- turns the code they carried into an approved profile. It is the only
-- sanctioned path that creates a profile for an ordinary person, so it is
-- worth being precise about why it is a database function rather than three
-- statements in a server action.
--
-- 1. ATOMICITY. The cap check and the increment must not be separable. Two
--    people redeeming the last seat at the same moment would both read
--    `uses = 4` against `max_uses = 5` and both write 5, and the cap that
--    exists to bound a forwarded code would have let one extra person in.
--    Taking a row lock (`for update`) before either makes the second caller
--    wait for the first to commit and then see the number it actually wrote.
--
-- 2. PRIVILEGE. `launch_codes` is admin-only in RLS, and `profiles` has no
--    insert policy at all — deliberately, so a signed-in stranger cannot
--    write themselves onto the roster. An ordinary caller therefore cannot
--    perform either half of this in their own right. `security definer` runs
--    the body as the owner, outside RLS, which is what lets a redemption
--    happen without handing the application a secret key. Step 3 needs no
--    service-role key because of this function.
--
-- The privilege is bounded by what the function cannot be asked to do: it
-- takes one argument, the code. There is no parameter for role, status, or
-- is_admin, and the insert writes 'Member' / 'approved' / false as literals,
-- so no argument exists that would make it mint an admin.
--
-- Not defended against here: guessing. A launch code is short and human-
-- readable by design ("read it at a meeting"), and this function will tell an
-- authenticated caller whether a given string is a code. That is the cost of a
-- shared code, and the mitigations are the ones PLAN.md already names — an
-- expiry, a redemption cap, and redemptions being visible to admins.

-- ---------------------------------------------------------------------------
-- The outcomes
-- ---------------------------------------------------------------------------

-- An enum rather than free text so `/welcome` can switch over the results
-- exhaustively: the generated TypeScript turns this into a union, and adding
-- a case here fails the type-check in any UI that has not handled it.
create type public.launch_code_outcome as enum (
  'redeemed',
  -- Already has an approved profile. Redeeming again is a no-op rather than an
  -- error: someone double-clicking, or re-opening the link from their inbox,
  -- has done nothing wrong and should simply be let in.
  'already_member',
  -- Their place was closed. A launch code must not be a way back in, so this
  -- is distinct from `already_member` and changes nothing.
  'revoked',
  'not_found',
  'expired',
  'exhausted'
);

-- ---------------------------------------------------------------------------
-- Codes are stored normalised
-- ---------------------------------------------------------------------------

-- A code is read aloud at a meeting or pasted out of an email, so it arrives
-- in whatever case and whitespace the person's keyboard produced. Redemption
-- normalises the input to `upper(btrim(...))`; this constraint makes the
-- stored side match, so the comparison can stay an equality against the
-- primary key instead of a function call that no index can serve.
alter table public.launch_codes
  add constraint launch_codes_code_normalised
    check (code = upper(btrim(code)) and char_length(code) between 4 and 64);

-- ---------------------------------------------------------------------------
-- redeem_launch_code
-- ---------------------------------------------------------------------------

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
  -- which `signInWithOtp`'s `data` put into the signup metadata. The
  -- finish-profile step lets them correct it, so the fallback only has to be
  -- reasonable, not right.
  select coalesce(
           nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
           split_part(u.email, '@', 1)
         )
  into v_name
  from auth.users u
  where u.id = v_user;

  -- Every privileged column is a literal. This is the line that makes the
  -- elevated rights safe to hand out: there is no input that reaches it.
  insert into public.profiles (id, name, role, status, is_admin)
  values (v_user, coalesce(v_name, 'Friend'), 'Member', 'approved', false)
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

-- Both revokes are needed, and the second is the one that is easy to miss.
-- Postgres grants EXECUTE to PUBLIC on every new function, and Supabase adds
-- its own default privilege granting EXECUTE to `anon`, `authenticated`, and
-- `service_role`. Revoking from PUBLIC does not touch that explicit grant, so
-- without the `anon` line an unauthenticated visitor can still call this — it
-- was verified reachable that way before the line was added. The `auth.uid()`
-- check at the top of the body is the second layer behind these.
revoke execute on function public.redeem_launch_code(text) from public;
revoke execute on function public.redeem_launch_code(text) from anon;
grant execute on function public.redeem_launch_code(text) to authenticated;

-- Peace Circle — admin bootstrap allowlist.
--
-- The first admin cannot be created through the app, because creating one
-- requires an admin. `bootstrap_admin_profile()` solves that: an allowlisted
-- address gets an approved admin profile the first time it signs in. This
-- migration is the allowlist's contents.
--
-- It lives in a migration rather than in seed.sql because seed.sql is local
-- only — `supabase db push` ships migrations and not the seed — so without
-- this the hosted project has an empty allowlist and nobody can ever become
-- an admin there.
--
-- Adding an admin later means another migration like this one, not an INSERT
-- typed into a dashboard, so the allowlist stays reproducible from the repo.

insert into public.admin_emails (email, role)
values
  -- Stored lowercase on purpose: the trigger matches on `lower(new.email)`,
  -- so an address with any capital letter here would silently never match.
  ('andrew@andrewsmith.org', 'Circle keeper')
on conflict (email) do nothing;

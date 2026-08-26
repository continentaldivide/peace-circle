
-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.resource_kind as enum ('quote', 'link', 'picture', 'book');

create type public.inquiry_status as enum (
  'new',
  'reviewing',
  'invited',
  'joined',
  'declined'
);

create type public.profile_status as enum ('approved', 'revoked');

-- ---------------------------------------------------------------------------
-- profiles — the row every RLS policy checks
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null default 'Member',
  status public.profile_status not null default 'approved',
  is_admin boolean not null default false,
  -- Hex colour for the member's avatar; the data seam maps this to `tint`.
  avatar_tint text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- admin_emails — bootstrap allowlist
-- ---------------------------------------------------------------------------

create table public.admin_emails (
  email text primary key,
  -- Display label for the profile this bootstraps, e.g. 'Circle keeper'. This
  -- is per-person data, so it lives here rather than in the trigger body — a
  -- second admin should not inherit the first one's title.
  role text not null default 'Member',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- inquiries — public interest-form submissions
-- ---------------------------------------------------------------------------

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  heard_from text not null,
  referred_by text,
  message text,
  status public.inquiry_status not null default 'new',
  handled_by uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index inquiries_status_created_at_idx
  on public.inquiries (status, created_at desc);

-- ---------------------------------------------------------------------------
-- launch_codes — shared onboarding codes for the launch cohort
-- ---------------------------------------------------------------------------

create table public.launch_codes (
  code text primary key,
  expires_at timestamptz not null,
  -- null = unlimited redemptions.
  max_uses integer,
  uses integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint launch_codes_uses_non_negative check (uses >= 0),
  constraint launch_codes_uses_within_max
    check (max_uses is null or uses <= max_uses)
);

-- ---------------------------------------------------------------------------
-- resources — the Library shares
-- ---------------------------------------------------------------------------

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind public.resource_kind not null,
  title text,
  body text,
  quote text,
  attribution text,
  url text,
  book_author text,
  image_path text,
  created_at timestamptz not null default now(),

  -- Each kind requires its own fields; without this a 'book' could be stored
  -- with no author, and the UI would render an empty card.
  constraint resources_kind_shape check (
    case kind
      when 'quote' then quote is not null
      when 'link' then title is not null and url is not null
      when 'picture' then title is not null
      when 'book' then title is not null and book_author is not null
    end
  ),

  -- Backs the Library's full-text search. The two-argument to_tsvector with a
  -- literal config is IMMUTABLE, which is what makes it legal in a generated
  -- column.
  search tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' ||
      coalesce(body, '') || ' ' ||
      coalesce(quote, '') || ' ' ||
      coalesce(attribution, '') || ' ' ||
      coalesce(book_author, '')
    )
  ) stored
);

create index resources_search_idx on public.resources using gin (search);
create index resources_created_at_idx on public.resources (created_at desc);
create index resources_author_id_idx on public.resources (author_id);

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

create index comments_resource_id_created_at_idx
  on public.comments (resource_id, created_at);

-- ---------------------------------------------------------------------------
-- messages — The Circle group chat
-- ---------------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

-- Chat history pages backwards by (created_at, id). Including id keeps the
-- cursor stable when two messages share a timestamp.
create index messages_created_at_id_idx
  on public.messages (created_at desc, id desc);

-- ---------------------------------------------------------------------------
-- events — admin-managed gatherings
-- ---------------------------------------------------------------------------

-- One table feeds the Home calendar, the Upcoming list, and the Meetings
-- page's next-gathering detail.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- Secondary line shown in Upcoming rows and the calendar legend.
  note text,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  -- The "what to expect" steps on the Meetings page.
  agenda text[] not null default '{}',
  address text,
  parking text,
  welcome text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint events_ends_after_starts
    check (ends_at is null or ends_at > starts_at)
);

create index events_starts_at_idx on public.events (starts_at);

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------------

-- These exist because a policy ON profiles that reads FROM profiles recurses
-- infinitely. SECURITY DEFINER runs the lookup as the owner, outside RLS,
-- breaking the cycle. `set search_path = ''` is why every reference below is
-- schema-qualified.

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and status = 'approved'
      and is_admin
  );
$$;

revoke execute on function public.is_approved() from public;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_approved() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin bootstrap trigger
-- ---------------------------------------------------------------------------

-- Fires on every signup, but deliberately does nothing for almost all of them:
-- ordinary members get their profile from the invite or launch-code flow, not
-- from here. This exists solely to solve the bootstrap problem — the very first
-- admin cannot be created through the app, because creating one requires an
-- admin. An allowlisted email gets an approved admin profile on first sign-in;
-- everyone else falls through and lands on /pending.
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
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    ),
    allowlisted.role,
    'approved',
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger bootstrap_admin_on_signup
  after insert on auth.users
  for each row execute function public.bootstrap_admin_profile();

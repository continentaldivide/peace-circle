-- Peace Circle — local development seed.
--
-- Runs on `supabase db reset` against the LOCAL stack only. `supabase db push`
-- ships migrations, not this file, so these fictional members never reach the
-- hosted project.
--
-- Ported from lib/data/mock.ts. The relative labels there ("2 days ago",
-- "4:12 PM", "Yesterday") become real timestamptz values computed from now(),
-- so the UI has genuine dates to format once the data seam swaps to Supabase
-- and formatting moves out of the data layer and into the components.

-- ---------------------------------------------------------------------------
-- Admin allowlist
-- ---------------------------------------------------------------------------
--
-- Not seeded here. The real addresses live in
-- supabase/migrations/*_admin_bootstrap.sql so they reach the hosted project
-- too, and migrations run before this file on `supabase db reset` — so the
-- allowlist is already populated by the time the fictional members below are
-- created. Inserting the same address here would collide on the primary key.

-- ---------------------------------------------------------------------------
-- Auth users. Magic-link only, so no usable password is set.
--
-- Making one of these by hand takes more than it looks, so the awkward part is
-- written once and looped over the member list below. It is a single DO block
-- rather than a helper function because the CLI sends this file in batches: a
-- function created here is not yet visible to a later statement that calls it.
-- ---------------------------------------------------------------------------

do $seed$
declare
  m record;
begin
  for m in
    select *
    from (values
      ('11111111-1111-1111-1111-111111111111'::uuid, 'lisa@example.com',  'Lisa Morrow'),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'ruth@example.com',  'Ruth Adeyemi'),
      ('33333333-3333-3333-3333-333333333333'::uuid, 'david@example.com', 'David Tran'),
      ('44444444-4444-4444-4444-444444444444'::uuid, 'marta@example.com', 'Marta Ibáñez'),
      ('55555555-5555-5555-5555-555555555555'::uuid, 'sam@example.com',   'Sam Okafor')
    ) as t(id, email, name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      -- Auth reads all eight of these into non-nullable strings, and none has
      -- a database default. Leave any one out and it is NULL, which makes
      -- *every* lookup of that user fail with a 500 — "converting NULL to
      -- string is unsupported" — while the row still looks perfectly fine in
      -- psql. All eight were confirmed necessary by nulling each in turn and
      -- watching sign-in break.
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    )
    values (
      '00000000-0000-0000-0000-000000000000', m.id,
      'authenticated', 'authenticated', m.email, '',
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('name', m.name),
      '', '', '', '', '', '', '', ''
    );

    -- Email sign-in resolves an address to a user through auth.identities, not
    -- through auth.users.email. Without a row here, requesting a magic link
    -- creates a *second* user with a fresh id, which then has no profile and
    -- lands an approved member on /pending.
    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    values (
      m.id::text, m.id,
      jsonb_build_object(
        'sub', m.id::text,
        'email', m.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email', now(), now(), now()
    );
  end loop;
end
$seed$;

-- ---------------------------------------------------------------------------
-- Profiles for the fictional members. These are written directly rather than
-- bootstrapped: the allowlist above holds a real address, so signing in as
-- yourself is what exercises the trigger. The upsert keeps this safe either
-- way — if an allowlisted address ever matches a seeded user, the trigger's
-- row wins on insert and this fills in the display details.
-- ---------------------------------------------------------------------------

insert into public.profiles (id, name, role, status, is_admin, avatar_tint)
values
  ('11111111-1111-1111-1111-111111111111', 'Lisa Morrow',  'Circle keeper', 'approved', true,  '#6b7355'),
  ('22222222-2222-2222-2222-222222222222', 'Ruth Adeyemi', 'Member',        'approved', false, '#8c8a6e'),
  ('33333333-3333-3333-3333-333333333333', 'David Tran',   'Member',        'approved', false, '#9a8f7a'),
  ('44444444-4444-4444-4444-444444444444', 'Marta Ibáñez', 'Member',        'approved', false, '#7e8466'),
  ('55555555-5555-5555-5555-555555555555', 'Sam Okafor',   'Member',        'approved', false, '#8f8b73')
on conflict (id) do update
  set name = excluded.name,
      role = excluded.role,
      avatar_tint = excluded.avatar_tint;

-- ---------------------------------------------------------------------------
-- Events — the June–October circles.
-- ---------------------------------------------------------------------------

insert into public.events (
  id, title, note, location, starts_at, ends_at, agenda,
  address, parking, welcome, created_by
)
values
  (
    'e0000000-0000-0000-0000-000000000001',
    'June Circle — an hour of stillness',
    'Grace United Church',
    'Fellowship Hall, Grace United Church',
    '2026-06-21 16:00:00-04', '2026-06-21 17:30:00-04',
    array[
      'Doors open at 3:45. Come in, find a seat, and settle.',
      'We begin with twenty minutes of shared silence — no experience needed.',
      'Someone offers a short reading or reflection to sit with.',
      'We close with tea and conversation. Leave whenever you need to.'
    ],
    '142 Linden Ave',
    'Street parking on Linden and Cedar. Enter through the garden door at the side of the hall.',
    'Newcomers always welcome — just come as you are.',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'July Circle', 'An ordinary hour of quiet',
    'Fellowship Hall, Grace United Church',
    '2026-07-19 16:00:00-04', '2026-07-19 17:30:00-04',
    '{}', '142 Linden Ave', null, null,
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'August Circle — evening sitting', 'Meeting later for the cooler hour',
    'Fellowship Hall, Grace United Church',
    '2026-08-16 18:30:00-04', '2026-08-16 20:00:00-04',
    '{}', '142 Linden Ave', null, null,
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'e0000000-0000-0000-0000-000000000004',
    'September Circle', 'Welcome tea for newcomers',
    'Fellowship Hall, Grace United Church',
    '2026-09-20 16:00:00-04', '2026-09-20 17:30:00-04',
    '{}', '142 Linden Ave', null, null,
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'e0000000-0000-0000-0000-000000000005',
    'October Circle', 'Bring a reading to share',
    'Fellowship Hall, Grace United Church',
    '2026-10-18 16:00:00-04', '2026-10-18 17:30:00-04',
    '{}', '142 Linden Ave', null, null,
    '11111111-1111-1111-1111-111111111111'
  );

-- ---------------------------------------------------------------------------
-- Resources.
-- ---------------------------------------------------------------------------

insert into public.resources (
  id, author_id, kind, title, body, quote, attribution, url, book_author,
  image_path, created_at
)
values
  (
    'a0000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111', 'quote',
    null, 'Read at last month''s circle. It stayed with me all week.',
    'Nothing can bring you peace but yourself.', '— Ralph Waldo Emerson',
    null, null, null, now() - interval '2 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    '33333333-3333-3333-3333-333333333333', 'book',
    'Wherever You Go, There You Are',
    'On simply being present. A gentle place to begin.',
    null, null, null, 'Jon Kabat-Zinn', null, now() - interval '7 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    '22222222-2222-2222-2222-222222222222', 'quote',
    null, null,
    'Within you there is a stillness and a sanctuary to which you can retreat at any time.',
    '— Hermann Hesse', null, null, null, now() - interval '8 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    '55555555-5555-5555-5555-555555555555', 'link',
    'A short guide to sitting in silence',
    'Plain, practical, non-religious. Good to hand to someone new.',
    null, null, 'plumvillage.org', null, null, now() - interval '9 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000006',
    '44444444-4444-4444-4444-444444444444', 'picture',
    'Candles after the April circle',
    'We sat with these until the last person was ready to leave.',
    null, null, null, null, null, now() - interval '14 days'
  );

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------

insert into public.comments (resource_id, author_id, body, created_at)
values
  (
    'a0000000-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222',
    'I keep coming back to this one. Thank you for sharing, Lisa.',
    now() - interval '2 days' + interval '3 hours'
  ),
  (
    'a0000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    'Going to write it on a card for my desk.',
    now() - interval '1 day'
  );

-- ---------------------------------------------------------------------------
-- The Circle chat. 39 messages so the Home chat's scroll-up paging (15 per
-- page) is exercisable. The mock's "you" messages are attributed to Lisa here,
-- since "you" only exists once someone is signed in.
-- ---------------------------------------------------------------------------

insert into public.messages (author_id, body, created_at)
values
  ('11111111-1111-1111-1111-111111111111', 'Good morning, friends. The hall is booked for the June circle — Sunday the 21st, four o''clock.', now() - interval '7 days' + interval '8 hours 40 minutes'),
  ('44444444-4444-4444-4444-444444444444', 'Wonderful. I''ll handle tea again if no one minds.', now() - interval '7 days' + interval '8 hours 52 minutes'),
  ('22222222-2222-2222-2222-222222222222', 'No objections here. Your tea is half the reason I come, Marta.', now() - interval '7 days' + interval '9 hours 15 minutes'),
  ('33333333-3333-3333-3333-333333333333', 'Is the side garden door open this time, or are we coming through the front?', now() - interval '7 days' + interval '10 hours 1 minute'),
  ('11111111-1111-1111-1111-111111111111', 'Garden door, as usual. I''ll prop it at 3:45 so no one''s left knocking.', now() - interval '7 days' + interval '10 hours 9 minutes'),
  ('55555555-5555-5555-5555-555555555555', 'Noted. I can come early and help set out the chairs.', now() - interval '7 days' + interval '11 hours 30 minutes'),
  ('11111111-1111-1111-1111-111111111111', 'I''ll come early too — happy to help with the room.', now() - interval '7 days' + interval '12 hours 2 minutes'),
  ('44444444-4444-4444-4444-444444444444', 'If we have new faces again, should we keep the silence to twenty minutes?', now() - interval '7 days' + interval '14 hours 18 minutes'),
  ('11111111-1111-1111-1111-111111111111', 'Twenty feels right. Long enough to settle, not so long it frightens anyone off.', now() - interval '7 days' + interval '14 hours 40 minutes'),
  ('22222222-2222-2222-2222-222222222222', 'Agreed. The depth comes from how we hold it, not how many minutes it runs.', now() - interval '7 days' + interval '15 hours 11 minutes'),

  ('33333333-3333-3333-3333-333333333333', 'Started the Kabat-Zinn book over the weekend. The chapter on patience undid me a little.', now() - interval '4 days' + interval '7 hours 48 minutes'),
  ('55555555-5555-5555-5555-555555555555', 'Which translation of patience does he use? The ''letting things unfold'' one?', now() - interval '4 days' + interval '8 hours 20 minutes'),
  ('33333333-3333-3333-3333-333333333333', 'That''s the one. ''Patience is a form of wisdom.'' I read it three times.', now() - interval '4 days' + interval '8 hours 35 minutes'),
  ('44444444-4444-4444-4444-444444444444', 'Maybe someone could read a passage from it on Sunday?', now() - interval '4 days' + interval '9 hours 50 minutes'),
  ('11111111-1111-1111-1111-111111111111', 'I''d be glad to, if David doesn''t want to. Or we could trade off.', now() - interval '4 days' + interval '10 hours 14 minutes'),
  ('33333333-3333-3333-3333-333333333333', 'Let''s trade off. You take the opening, I''ll take something at the close.', now() - interval '4 days' + interval '10 hours 30 minutes'),
  ('11111111-1111-1111-1111-111111111111', 'Lovely. I''ll leave space for both in the order.', now() - interval '4 days' + interval '13 hours 5 minutes'),
  ('22222222-2222-2222-2222-222222222222', 'Quiet question for the group: does anyone find the silence harder some weeks than others?', now() - interval '4 days' + interval '16 hours 22 minutes'),
  ('55555555-5555-5555-5555-555555555555', 'Always. The weeks I most want to skip it are the weeks I need it most.', now() - interval '4 days' + interval '16 hours 48 minutes'),
  ('44444444-4444-4444-4444-444444444444', 'Same. I''ve learned to let the restlessness sit there with me instead of fighting it.', now() - interval '4 days' + interval '17 hours 30 minutes'),
  ('11111111-1111-1111-1111-111111111111', 'That''s a kinder way to put it than I''ve managed. Thank you, Marta.', now() - interval '4 days' + interval '18 hours 2 minutes'),

  ('11111111-1111-1111-1111-111111111111', 'Two newcomers emailed me overnight asking about Sunday. Word is spreading gently.', now() - interval '3 days' + interval '8 hours 11 minutes'),
  ('22222222-2222-2222-2222-222222222222', 'That''s heartening. Shall we save a couple of seats near the door for them?', now() - interval '3 days' + interval '8 hours 33 minutes'),
  ('11111111-1111-1111-1111-111111111111', 'Good idea — easy to slip in and out if they feel unsure.', now() - interval '3 days' + interval '8 hours 45 minutes'),
  ('33333333-3333-3333-3333-333333333333', 'I''ll bring a few extra copies of the welcome card for them.', now() - interval '3 days' + interval '11 hours 20 minutes'),
  ('55555555-5555-5555-5555-555555555555', 'And I''ll have the kettle going early so there''s tea the moment we close.', now() - interval '3 days' + interval '12 hours 40 minutes'),
  ('44444444-4444-4444-4444-444444444444', 'We''re a well-rehearsed little circle, aren''t we. In the best way.', now() - interval '3 days' + interval '15 hours 15 minutes'),
  ('11111111-1111-1111-1111-111111111111', 'It only feels effortless because everyone quietly does their part.', now() - interval '3 days' + interval '15 hours 52 minutes'),

  ('22222222-2222-2222-2222-222222222222', 'Still thinking about the silence at the end of last circle. Anyone else feel how long it held?', now() - interval '1 day' + interval '16 hours 12 minutes'),
  ('33333333-3333-3333-3333-333333333333', 'Yes. I didn''t want to be the one to break it.', now() - interval '1 day' + interval '16 hours 20 minutes'),
  ('44444444-4444-4444-4444-444444444444', 'There was a moment where even the traffic outside seemed to hush.', now() - interval '1 day' + interval '16 hours 38 minutes'),
  ('55555555-5555-5555-5555-555555555555', 'I noticed that too. Strange how a room full of people can be that still.', now() - interval '1 day' + interval '17 hours 5 minutes'),
  ('11111111-1111-1111-1111-111111111111', 'I carried it home with me. The quiet stayed in the car the whole drive.', now() - interval '1 day' + interval '17 hours 41 minutes'),
  ('11111111-1111-1111-1111-111111111111', 'That''s the circle doing what it''s meant to. It follows you out the door.', now() - interval '1 day' + interval '18 hours 20 minutes'),
  ('22222222-2222-2222-2222-222222222222', 'Beautifully said. Sleep well, all. Until Sunday.', now() - interval '1 day' + interval '19 hours 2 minutes'),

  ('11111111-1111-1111-1111-111111111111', 'Morning, all. I''ll bring extra cushions Sunday — we had a few new faces last time.', now() - interval '4 hours'),
  ('55555555-5555-5555-5555-555555555555', 'I can drive two more from the east side if anyone needs a lift.', now() - interval '3 hours 48 minutes'),
  ('44444444-4444-4444-4444-444444444444', 'I''ll have tea and cups ready by 5:15 so we don''t lose the calm to a scramble.', now() - interval '3 hours 40 minutes'),
  ('11111111-1111-1111-1111-111111111111', 'Count me in for cushions duty too. See everyone Sunday.', now() - interval '3 hours 31 minutes');

-- ---------------------------------------------------------------------------
-- One pending inquiry so the admin queue has something to render.
-- ---------------------------------------------------------------------------

insert into public.inquiries (name, email, heard_from, referred_by, message)
values (
  'Priya Raman',
  'priya@example.com',
  'A friend mentioned it after a difficult month.',
  'Marta Ibáñez',
  'I have never done anything like this before. Is it alright to just come and sit?'
);

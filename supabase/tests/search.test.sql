-- Peace Circle — what the Library's search finds.
--
-- Not a gate test (those are in rls.test.sql); this pins down behaviour a
-- member would call obvious, against the seeded shares, because the first
-- version of the search looked right and failed exactly these.
--
-- Run with: supabase test db

begin;
select plan(16);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

-- Seeded shares used below (supabase/seed.sql):
--   …0001  quote  "Nothing can bring you peace but yourself." — Emerson
--   …0003  book   "Wherever You Go, There You Are" by Jon Kabat-Zinn
--   …0004  quote  "Within you there is a stillness and a sanctuary to which
--                  you can retreat at any time." — Hermann Hesse
--   …0005  link   "A short guide to sitting in silence", plumvillage.org
--   …0006  picture "Candles after the April circle"

create function pg_temp.finds(q text, share uuid) returns boolean
language sql as $$
  select exists (select 1 from public.search_resources(q) where id = share)
$$;

-- ---------------------------------------------------------------------------
-- Stop words are words. English full-text search drops "can", "any", "you" —
-- from the query as well as the index — so on its own it matched nothing for
-- a search made of them.
-- ---------------------------------------------------------------------------

select ok(pg_temp.finds('can', 'a0000000-0000-0000-0000-000000000004'),
  '"can" finds a quote containing "can"');
select ok(pg_temp.finds('can', 'a0000000-0000-0000-0000-000000000001'),
  '"can" finds every share containing it, not just one');
select ok(pg_temp.finds('any time', 'a0000000-0000-0000-0000-000000000004'),
  'a phrase of stop words and ordinary words finds the quote');
select ok(pg_temp.finds('there you are', 'a0000000-0000-0000-0000-000000000003'),
  'a book title made almost entirely of stop words is findable');

-- ---------------------------------------------------------------------------
-- A half-typed word is the start of a word. The box searches as you type, so
-- without this nearly every keystroke reported that nothing matched.
-- ---------------------------------------------------------------------------

select ok(pg_temp.finds('sanct', 'a0000000-0000-0000-0000-000000000004'),
  '"sanct" finds "sanctuary"');
select ok(pg_temp.finds('herm', 'a0000000-0000-0000-0000-000000000004'),
  'the attribution is searched, by prefix');
select ok(pg_temp.finds('kabat', 'a0000000-0000-0000-0000-000000000003'),
  'the book author is searched, by prefix');
select ok(pg_temp.finds('Kabat-Zinn', 'a0000000-0000-0000-0000-000000000003'),
  'a hyphenated name typed whole is found');
select ok(pg_temp.finds('plum', 'a0000000-0000-0000-0000-000000000005'),
  'a link''s web address is searched');
select ok(pg_temp.finds('HESSE', 'a0000000-0000-0000-0000-000000000004'),
  'search ignores case');

-- ---------------------------------------------------------------------------
-- What prefixes cannot do, the stemmed half still does.
-- ---------------------------------------------------------------------------

select ok(pg_temp.finds('retreating', 'a0000000-0000-0000-0000-000000000004'),
  '"retreating" finds "retreat" by stem');
select ok(pg_temp.finds('circles', 'a0000000-0000-0000-0000-000000000006'),
  '"circles" finds "circle" by stem');

-- ---------------------------------------------------------------------------
-- Narrowing, and input that is not words.
-- ---------------------------------------------------------------------------

select ok(not pg_temp.finds('can zzzz', 'a0000000-0000-0000-0000-000000000004'),
  'every typed word must match: one word that matches nothing excludes the share');

select lives_ok(
  $$select count(*) from public.search_resources('!!! & | ( ) :* '' \')$$,
  'punctuation and tsquery operators do not raise'
);
select is(
  (select count(*) from public.search_resources('!!! & | ( ) :* '' \')),
  0::bigint,
  'input with no words in it finds nothing'
);

-- Both halves matching must not return a share twice.
select is(
  (select count(*) from public.search_resources('retreat')
    where id = 'a0000000-0000-0000-0000-000000000004'),
  1::bigint,
  'a share matching both ways is returned once'
);

reset role;

select * from finish();
rollback;

-- Peace Circle — search the Library the way people type into a search box.
--
-- Step 6 searched `resources.search`, an `english` tsvector, with
-- `websearch_to_tsquery('english', …)`. That configuration was built for
-- documents, not for a box someone types into, and it failed ordinary searches
-- in two ways:
--
-- - **It throws common words away**, from the index and from the query alike.
--   "can", "any", "there", "you" are English stop words, so a search made of
--   them becomes an empty query and matches nothing — "can" did not find a quote
--   that says "you can retreat at any time".
-- - **It only matches whole words.** "sanct" did not find "sanctuary", nor "herm"
--   "Hermann". The search box searches as the member types, so every half-typed
--   word briefly said nothing matched.
--
-- It also never indexed a link's address, so "plum" did not find plumvillage.org.
--
-- The fix adds a second index rather than replacing the first. `search_words`
-- is a `simple` tsvector — lower-cased, every word kept, nothing stemmed — and a
-- query against it treats each typed word as the *start* of a word. A share
-- matches if it matches either way:
--
-- - `search_words`, prefix by prefix: what was typed, as typed, including stop
--   words and half-finished words.
-- - `search`, as before: stemmed, so "retreating" still finds "retreat" and
--   "candles" still finds "candle" — neither of which a prefix can do — and the
--   quotes / "or" / leading-dash operators still work there.

alter table public.resources
  add column search_words tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(body, '') || ' ' ||
      coalesce(quote, '') || ' ' ||
      coalesce(attribution, '') || ' ' ||
      coalesce(book_author, '') || ' ' ||
      coalesce(url, '')
    )
  ) stored;

create index resources_search_words_idx
  on public.resources using gin (search_words);

-- Every word in the typed text as a prefix, all required: "can ret" becomes
-- 'can':* & 'ret':*.
--
-- The words come from `to_tsvector('simple', …)` — the same parser that built
-- `search_words` — so the query and the index always split text the same way:
-- "Kabat-Zinn", "plumvillage.org" and "don't" each break into exactly the
-- lexemes the stored vector has. The parser never produces a lexeme containing
-- tsquery syntax, and `quote_literal` wraps each one regardless, so no input can
-- turn into an operator or a syntax error. Input with no words at all ("!!!")
-- yields null, and `@@ null` matches no row.
create or replace function public.prefix_tsquery(p_text text)
returns tsquery
language sql
immutable
strict
set search_path = ''
as $$
  select pg_catalog.string_agg(
           pg_catalog.quote_literal(t.lexeme) || ':*', ' & '
         )::pg_catalog.tsquery
  from pg_catalog.unnest(pg_catalog.to_tsvector('simple', p_text)) as t;
$$;

-- The Library's search, callable through PostgREST as an RPC so the page can
-- still embed comments and order the results the way the unsearched Library is
-- ordered. SECURITY INVOKER, so RLS on `resources` applies exactly as it does to
-- a plain select: a caller who is not an approved member gets no rows.
create or replace function public.search_resources(p_query text)
returns setof public.resources
language sql
stable
security invoker
set search_path = ''
as $$
  select r.*
  from public.resources r
  where r.search_words @@ public.prefix_tsquery(p_query)
     or r.search @@ pg_catalog.websearch_to_tsquery('english', p_query);
$$;

-- Revoked from `anon` by name as well as from `public`: Supabase's default
-- privileges grant EXECUTE on every new function in this schema to `anon`
-- directly, so revoking the `public` grant alone leaves it callable. RLS would
-- still hand an anonymous caller no rows, but a search is a member feature and
-- should not be reachable at all without a session. The gate tests assert it.
revoke execute on function public.prefix_tsquery(text) from public, anon;
revoke execute on function public.search_resources(text) from public, anon;
grant execute on function public.prefix_tsquery(text) to authenticated;
grant execute on function public.search_resources(text) to authenticated;

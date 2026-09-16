/**
 * The Library's search query, as it travels between the URL and Postgres.
 *
 * Search lives in `?q=` rather than in component state so a result set is
 * shareable, survives the `refresh()` a new share or comment ends in, and stays
 * on the server where the `resources_search_idx` index is. That means the query
 * arrives as a search param — which is to say, as whatever someone put in the
 * address bar — so it is normalised here rather than trusted.
 *
 * Kept out of `lib/data/index.ts` so the search box, which runs in the browser,
 * can build the same URL the server will read back without importing a
 * `server-only` module.
 */

/**
 * Long enough for a remembered phrase, short enough that a pasted essay does
 * not become a URL. `websearch_to_tsquery` would cope; the address bar and the
 * RSC payload are the reason for the ceiling.
 */
const MAX_LENGTH = 200;

/** The `q` search param as a query, or "" for no search at all. */
export function normalizeSearch(value: string | string[] | undefined): string {
  // `?q=a&q=b` is not something this app builds. The first one is a kinder
  // reading of a hand-edited URL than an error or an empty Library.
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return "";
  // Whitespace collapses, because " " must mean everything rather than
  // nothing, and "be   still" and "be still" are the same search.
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_LENGTH);
}

/** Where the Library lives for a given query. "" is the unfiltered Library. */
export function libraryHref(query: string): string {
  const q = normalizeSearch(query);
  return q ? `/library?q=${encodeURIComponent(q)}` : "/library";
}

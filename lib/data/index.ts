import "server-only";

import { requireApproved } from "@/lib/dal";
import { decodeCursor, encodeCursor, olderThanFilter } from "@/lib/data/cursor";
import {
  toCircleEvent,
  toMember,
  toMessage,
  toResource,
} from "@/lib/data/rows";
import { normalizeSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import type {
  CircleEvent,
  Member,
  MessagePage,
  Resource,
} from "@/lib/data/types";

export type {
  BookResource,
  CircleEvent,
  Comment,
  LinkResource,
  Member,
  Message,
  MessagePage,
  PictureResource,
  QuoteResource,
  Resource,
  ResourceKind,
} from "@/lib/data/types";

/** Default page size for chat history reads. */
const MESSAGES_PAGE_SIZE = 15;

/**
 * The single data-access seam. Every page reads through these functions and
 * never touches the data source directly; components see the shapes in
 * `types.ts`, never a table's columns.
 *
 * Each function calls `requireApproved()` before it queries. The database is
 * the real gate — RLS returns nothing to anyone else — but a forgotten check
 * should be a redirect to /signin or /pending, not a page that is quietly
 * empty. The check is `cache()`d, so the repeats within a render are free.
 *
 * Reads only, still: the writes live in `app/actions/` beside the forms that
 * call them, each going through the same `requireApproved()` gate. What they
 * insert is mapped by `rows.ts`, so the columns are named in one place for
 * both directions.
 */

/**
 * The Library, newest first, each share with its comments oldest first.
 *
 * One query: comments come embedded through their foreign key rather than as
 * a request per share. `id` breaks ties so two rows written in the same
 * instant keep a stable order between renders.
 *
 * `search` narrows it to the shares matching a member's words, against the
 * `resources.search` tsvector — a generated column over the title, body, quote,
 * attribution and book author, indexed by `resources_search_idx`. An empty or
 * whitespace query is no search at all, not a search for nothing: the whole
 * Library comes back. `normalizeSearch` is what settles that, in one place, for
 * the search box and for here.
 *
 * `websearch_to_tsquery`, not `plainto_tsquery` or `to_tsquery`. This is a box
 * a person types into, and the three read that person very differently:
 * `to_tsquery` demands tsquery syntax and raises a syntax error on a stray
 * apostrophe or dash, which would turn a typo into a 500; `plainto_tsquery`
 * never raises but ANDs every word and discards punctuation, so quoting a
 * phrase or typing "or" does nothing at all. `websearch_to_tsquery` also never
 * raises, and reads quotes as a phrase, "or" as alternation, and a leading dash
 * as exclusion — the conventions someone already has from every other search
 * box. That is why the query is passed through unescaped: it is input to a
 * parser that is specified to accept anything.
 *
 * Results stay newest-first rather than ranked by `ts_rank`. The Library is a
 * chronological feed and a search narrows it; reordering it by relevance would
 * make the same share sit in a different place depending on what was typed, and
 * ranking through PostgREST would need an RPC, putting a read outside this seam.
 */
export async function getResources(opts?: {
  /** The member's words, or "" / omitted for the whole Library. */
  search?: string;
}): Promise<Resource[]> {
  await requireApproved();
  const query = normalizeSearch(opts?.search);

  const supabase = await createClient();
  let request = supabase
    .from("resources")
    .select(
      "id, author_id, kind, title, body, quote, attribution, url, book_author, created_at, comments (id, author_id, body, created_at)",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .order("created_at", { referencedTable: "comments", ascending: true })
    .order("id", { referencedTable: "comments", ascending: true });

  if (query) {
    request = request.textSearch("search", query, {
      type: "websearch",
      config: "english",
    });
  }

  const { data, error } = await request;
  if (error) throw new Error(`Could not read resources: ${error.message}`);
  return data.map(toResource);
}

/**
 * Every profile, for resolving authors. Includes revoked members on purpose:
 * revoking leaves someone's words in place, and those words still need a name
 * beside them. RLS lets approved members read every profile for this reason.
 * Filter by status only where something lists the circle's *current* members.
 */
export async function getMembers(): Promise<Member[]> {
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, role, avatar_tint")
    .order("name");

  if (error) throw new Error(`Could not read members: ${error.message}`);
  return data.map(toMember);
}

/**
 * One page of Circle history, newest-first by page. Passing no `before` returns
 * the most recent `limit` messages; passing the previous page's `nextCursor`
 * returns the `limit` messages immediately older than it. Messages within a
 * page are chronological (oldest→newest).
 *
 * Pages by `(created_at, id)`, not by timestamp alone — see `cursor.ts` for
 * why. Reads one row past the limit to learn whether older history exists
 * without a second query.
 */
export async function getMessages(opts?: {
  before?: string;
  limit?: number;
}): Promise<MessagePage> {
  await requireApproved();
  const limit = opts?.limit ?? MESSAGES_PAGE_SIZE;

  const supabase = await createClient();
  let query = supabase
    .from("messages")
    .select("id, author_id, body, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (opts?.before !== undefined) {
    const cursor = decodeCursor(opts.before);
    // The cursor came back from a browser. One this app did not make is a
    // bad request, not an empty page.
    if (!cursor) throw new Error("Invalid message cursor");
    query = query.or(olderThanFilter(cursor));
  }

  const { data, error } = await query;
  if (error) throw new Error(`Could not read messages: ${error.message}`);

  const hasMore = data.length > limit;
  const messages = data.slice(0, limit).reverse().map(toMessage);
  const oldest = messages[0];
  return {
    messages,
    hasMore,
    nextCursor: oldest
      ? encodeCursor({ createdAt: oldest.createdAt, id: oldest.id })
      : null,
  };
}

/**
 * Every gathering, past and upcoming, earliest first. Past ones stay because
 * the calendar can page back to them; the Home view decides what counts as
 * upcoming, against the circle's today.
 */
export async function getCircleEvents(): Promise<CircleEvent[]> {
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, note, starts_at")
    .order("starts_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw new Error(`Could not read events: ${error.message}`);
  return data.map(toCircleEvent);
}

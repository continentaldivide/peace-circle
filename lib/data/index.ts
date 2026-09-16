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

/** Every column a Library card needs, with its comments embedded. */
const RESOURCE_COLUMNS =
  "id, author_id, kind, title, body, quote, attribution, url, book_author, image_path, image_width, image_height, created_at, comments (id, author_id, body, created_at)";

/**
 * The Library, newest first, each share with its comments oldest first.
 *
 * One query: comments come embedded through their foreign key rather than as
 * a request per share. `id` breaks ties so two rows written in the same
 * instant keep a stable order between renders.
 *
 * `search` narrows it to the shares matching a member's words. An empty or
 * whitespace query is no search at all, not a search for nothing: the whole
 * Library comes back. `normalizeSearch` is what settles that, in one place, for
 * the search box and for here.
 *
 * The matching itself is the `search_resources` database function, called as an
 * RPC so the results can still embed their comments and be ordered like the
 * unsearched Library. A share matches in either of two ways (see
 * `supabase/migrations/20260916000003_library_search_words.sql`):
 *
 * - **Every typed word is the start of a word in the share** — title, body,
 *   quote, attribution, book author, or web address. This is what a search box
 *   is expected to do: "can" finds "you can retreat", "sanct" finds
 *   "sanctuary", "plum" finds plumvillage.org. Nothing typed is discarded.
 * - **Or the words match by stem**, in English, as the first version of this
 *   search did: "retreating" finds "retreat", "candles" finds "candle". A
 *   prefix cannot do that. Quotes, "or" and a leading dash are honoured here,
 *   through `websearch_to_tsquery`, which accepts any input without raising.
 *
 * The first version used only the second, and it failed searches a member
 * would call obvious: English stop words ("can", "any", "you") are dropped
 * from the query entirely, so a search made of them matched nothing, and a
 * half-typed word matched nothing either — which, in a box that searches as you
 * type, is most of the time.
 *
 * The query reaches both halves as plain text, unescaped: neither can be made
 * to raise by what is typed. The prefix query is built inside Postgres from
 * the same parser that built the index, so the two always split words the same
 * way.
 *
 * Results stay newest-first rather than ranked. The Library is a chronological
 * feed and a search narrows it; reordering by relevance would move a share
 * depending on what was typed.
 */
export async function getResources(opts?: {
  /** The member's words, or "" / omitted for the whole Library. */
  search?: string;
}): Promise<Resource[]> {
  await requireApproved();
  const query = normalizeSearch(opts?.search);

  const supabase = await createClient();
  const source = query
    ? supabase.rpc("search_resources", { p_query: query })
    : supabase.from("resources");

  const { data, error } = await source
    .select(RESOURCE_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .order("created_at", { referencedTable: "comments", ascending: true })
    .order("id", { referencedTable: "comments", ascending: true });

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

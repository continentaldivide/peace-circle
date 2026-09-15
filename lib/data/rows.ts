import type {
  CircleEvent,
  Comment,
  Member,
  Message,
  Resource,
} from "@/lib/data/types";
import type { Database } from "@/lib/supabase/database.types";
import { circleDate } from "@/lib/time";
import { initialsFor } from "@/lib/utils";

/**
 * Where database rows become the shapes components use.
 *
 * Column names stop here: components see `tint`, never `avatar_tint`. Kept
 * apart from `index.ts` so `lib/dal.ts` can share these mappers without the
 * two modules importing each other, and pure so they can be tested without a
 * database.
 */

type Tables = Database["public"]["Tables"];

export type ProfileRow = Tables["profiles"]["Row"];

/** Avatar colour for a member who has not chosen one. */
const DEFAULT_TINT = "var(--ink-soft)";

export function toMember(
  row: Pick<ProfileRow, "id" | "name" | "role" | "avatar_tint">,
): Member {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    initials: initialsFor(row.name),
    tint: row.avatar_tint ?? DEFAULT_TINT,
  };
}

export type ResourceRow = Pick<
  Tables["resources"]["Row"],
  | "id"
  | "author_id"
  | "kind"
  | "title"
  | "body"
  | "quote"
  | "attribution"
  | "url"
  | "book_author"
  | "created_at"
> & {
  comments: Pick<
    Tables["comments"]["Row"],
    "id" | "author_id" | "body" | "created_at"
  >[];
};

/**
 * A column the `resources_kind_shape` check guarantees for this kind. The
 * generated types cannot know that, so a null here means the constraint and
 * this code disagree — worth failing loudly over, not rendering as a blank.
 */
function required<T>(value: T | null, column: string, row: ResourceRow): T {
  if (value === null) {
    throw new Error(`${row.kind} ${row.id} has no ${column}`);
  }
  return value;
}

/**
 * The four kinds share one table. Each kind's free text lives in `body`: a
 * quote's note, a link's or book's description, a picture's caption.
 */
export function toResource(row: ResourceRow): Resource {
  const base = {
    id: row.id,
    authorId: row.author_id,
    createdAt: row.created_at,
    comments: row.comments.map((c): Comment => ({
      id: c.id,
      authorId: c.author_id,
      createdAt: c.created_at,
      body: c.body,
    })),
  };
  const body = row.body ?? undefined;

  switch (row.kind) {
    case "quote":
      return {
        ...base,
        kind: "quote",
        quote: required(row.quote, "quote", row),
        // Stored with its leading "— ", so it renders as written.
        attribution: row.attribution ?? "",
        note: body,
      };
    case "link":
      return {
        ...base,
        kind: "link",
        title: required(row.title, "title", row),
        url: required(row.url, "url", row),
        body,
      };
    case "picture": {
      const title = required(row.title, "title", row);
      return {
        ...base,
        kind: "picture",
        title,
        caption: body,
        // No image column is read yet (Step 6), so the placeholder says what
        // the picture is, the way the composer does for a new one.
        placeholder: `photo — ${title.toLowerCase()}`,
      };
    }
    case "book":
      return {
        ...base,
        kind: "book",
        title: required(row.title, "title", row),
        bookAuthor: required(row.book_author, "book_author", row),
        body,
      };
  }
}

export type MessageRow = Pick<
  Tables["messages"]["Row"],
  "id" | "author_id" | "body" | "created_at"
>;

export function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    authorId: row.author_id,
    createdAt: row.created_at,
    body: row.body,
  };
}

export type EventRow = Pick<
  Tables["events"]["Row"],
  "id" | "title" | "note" | "starts_at"
>;

/**
 * `date` is fixed here, in the circle's zone, rather than left to each
 * component: an evening gathering is already the next day in UTC, and the
 * calendar and the Upcoming list must agree on which day it is.
 */
export function toCircleEvent(row: EventRow): CircleEvent {
  return {
    id: row.id,
    title: row.title,
    note: row.note ?? undefined,
    date: circleDate(row.starts_at),
    startsAt: row.starts_at,
  };
}

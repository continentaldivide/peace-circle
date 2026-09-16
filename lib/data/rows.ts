import type { ResourceDraft } from "@/lib/resources";
import { normalizeUrl } from "@/lib/resources";
import type {
  CircleEvent,
  Comment,
  Member,
  Message,
  Resource,
  ResourceImage,
} from "@/lib/data/types";
import { imageSrc } from "@/lib/images";
import type { Database } from "@/lib/supabase/database.types";
import { circleDate } from "@/lib/time";
import { initialsFor } from "@/lib/utils";

/**
 * Where database rows become the shapes components use, and back again.
 *
 * Column names stop here: components see `tint`, never `avatar_tint`, and a
 * composed share becomes columns in `toResourceInsert` rather than in the
 * action that writes it. Kept apart from `index.ts` so `lib/dal.ts` can share
 * these mappers without the two modules importing each other, and pure so they
 * can be tested without a database.
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
  | "image_path"
  | "image_width"
  | "image_height"
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
    case "picture":
      return {
        ...base,
        kind: "picture",
        title: required(row.title, "title", row),
        caption: body,
        image: toResourceImage(row),
      };
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

/**
 * The picture's three image columns as one thing, or nothing.
 *
 * Not `required()`, unlike the columns above. Those name a field the
 * `resources_kind_shape` check guarantees, so a null means the constraint and
 * this code disagree and failing loudly is right. Here an absent image is an
 * ordinary state — every picture shared before uploads existed has none — and
 * a row somehow carrying a path without its dimensions is better drawn as a
 * share without a photo than as a Library that will not render.
 */
function toResourceImage(row: ResourceRow): ResourceImage | undefined {
  if (row.image_path === null) return undefined;
  if (row.image_width === null || row.image_height === null) return undefined;
  return {
    src: imageSrc(row.image_path),
    width: row.image_width,
    height: row.image_height,
  };
}

/** A new share, as the columns it is stored in. */
export type ResourceInsert = Tables["resources"]["Insert"];

/**
 * The write half of `toResource`: a composed draft as a row.
 *
 * The four kinds share one table and each fills a different subset of its
 * columns — which is the `resources_kind_shape` check constraint's business,
 * so it is settled here rather than in the action. Everything a kind has no
 * field for is simply left out, so a url typed under the Link chip cannot ride
 * along on a quote the member changed their mind into.
 *
 * A picture's `image_path` is the one field here that names something outside
 * the row, and only the picture branch reads it — an image uploaded under the
 * Picture chip cannot ride along on a quote the member changed their mind
 * into, for the same reason a url cannot.
 */
export function toResourceInsert(
  draft: ResourceDraft,
  author: { id: string; name: string },
): ResourceInsert {
  // Every kind's free text shares one column, and an empty box is nothing to
  // store rather than an empty string to render.
  const body = draft.note.trim() || null;

  switch (draft.kind) {
    case "quote":
      return {
        author_id: author.id,
        kind: "quote",
        quote: draft.quote.trim(),
        // Stored with whatever dash was typed, because `toResource` renders it
        // as written. Unattributed lines are credited to the member passing
        // them along — from the session's name, not the browser's word for it.
        attribution: draft.attribution.trim() || `— shared by ${author.name}`,
        body,
      };
    case "link": {
      // Validated before this is reached, so null here would mean
      // `validateResource` and this mapper disagree — worth failing over
      // rather than storing an address that goes nowhere.
      const url = normalizeUrl(draft.url);
      if (!url) throw new Error("A link reached the insert with no address");
      return {
        author_id: author.id,
        kind: "link",
        title: draft.title.trim(),
        url,
        body,
      };
    }
    case "picture":
      return {
        author_id: author.id,
        kind: "picture",
        title: draft.title.trim(),
        body,
        // All three together or all three null — `resources_image_shape` will
        // not have it any other way, and a picture with no photo at all is an
        // ordinary share rather than a half-finished one.
        image_path: draft.image?.path ?? null,
        image_width: draft.image?.width ?? null,
        image_height: draft.image?.height ?? null,
      };
    case "book":
      return {
        author_id: author.id,
        kind: "book",
        title: draft.title.trim(),
        // The column is not null and the composer does not insist on the
        // field, so an unnamed author is stored as the card already reads.
        book_author: draft.bookAuthor.trim() || "Unknown",
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

// Shapes mirror the design handoff's resource model. UI components depend only
// on these types and the accessor functions in `index.ts` — never on where the
// data comes from.
//
// Timestamps cross this boundary as ISO strings, never as display labels and
// never as Dates (which do not survive the trip to a client component intact).
// Components format them with `lib/time.ts`, in the circle's timezone.

export type Member = {
  id: string;
  name: string;
  role: string;
  initials: string;
  /** Fixed avatar tint (consistent across variants). */
  tint: string;
};

export type Comment = {
  id: string;
  authorId: string;
  /** ISO timestamp. */
  createdAt: string;
  body: string;
};

type ResourceBase = {
  id: string;
  authorId: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Oldest first. */
  comments: Comment[];
};

export type QuoteResource = ResourceBase & {
  kind: "quote";
  quote: string;
  attribution: string;
  note?: string;
};

export type LinkResource = ResourceBase & {
  kind: "link";
  title: string;
  url: string;
  body?: string;
};

/**
 * An uploaded picture, ready to render. `src` is a route of this app's, not a
 * storage URL — the bucket is private — and the dimensions come from the row so
 * the box can be reserved before the bytes arrive.
 */
export type ResourceImage = {
  src: string;
  width: number;
  height: number;
};

export type PictureResource = ResourceBase & {
  kind: "picture";
  title: string;
  caption?: string;
  /**
   * Absent when the share has no photo. Every picture in the Library from
   * before uploads existed is in that state, and so is one composed without
   * choosing a file, so this is an ordinary case rather than a broken row.
   */
  image?: ResourceImage;
};

export type BookResource = ResourceBase & {
  kind: "book";
  title: string;
  bookAuthor: string;
  body?: string;
};

export type Resource =
  QuoteResource | LinkResource | PictureResource | BookResource;

export type ResourceKind = Resource["kind"];

/** A message in The Circle group chat. */
export type Message = {
  id: string;
  authorId: string;
  /** ISO timestamp. The day divider and time label are both formatted from it. */
  createdAt: string;
  body: string;
};

/**
 * One batch of chat history. The Circle loads the newest page on mount and
 * fetches older pages as the member scrolls up. Cursor-based (not offset) so
 * pages stay stable as new messages arrive at the bottom.
 */
export type MessagePage = {
  /** Chronological (oldest→newest) within this batch. */
  messages: Message[];
  /** Are there older messages before this batch? */
  hasMore: boolean;
  /**
   * Cursor for the batch *older* than this one; null when at the start.
   * Opaque to components: pass it back to `loadOlderMessages` unchanged.
   */
  nextCursor: string | null;
};

/**
 * A scheduled circle gathering with a machine-readable date, so the member
 * Home can render a real month calendar and its Upcoming list.
 */
export type CircleEvent = {
  id: string;
  title: string;
  /** Secondary line shown in Upcoming rows. */
  note?: string;
  /** The day it starts in the circle's timezone, e.g. "2026-06-21". */
  date: string;
  /** ISO timestamp; components format the time from it. */
  startsAt: string;
};

// Shapes mirror the design handoff's resource model. UI components depend only
// on these types and the accessor functions in `index.ts` — never on where the
// data comes from. Phase 2 backs the same functions with Supabase queries.

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
  when: string; // relative label in the prototype; a timestamp in Phase 2
  body: string;
};

type ResourceBase = {
  id: string;
  authorId: string;
  when: string;
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

export type PictureResource = ResourceBase & {
  kind: "picture";
  title: string;
  caption?: string;
  /** Caption shown inside the striped placeholder (no real images yet). */
  placeholder: string;
};

export type BookResource = ResourceBase & {
  kind: "book";
  title: string;
  bookAuthor: string;
  body?: string;
};

export type EventResource = ResourceBase & {
  kind: "event";
  title: string;
  eventDate: string;
  location?: string;
  body?: string;
};

export type Resource =
  | QuoteResource
  | LinkResource
  | PictureResource
  | BookResource
  | EventResource;

export type ResourceKind = Resource["kind"];

/** The "what to expect" detail for the next gathering. */
export type NextMeeting = {
  tag: string;
  date: string;
  location: string;
  expect: string[];
  goodToKnow: {
    address: string;
    parking: string;
    welcome: string;
  };
};

export type Meeting = {
  id: string;
  month: string;
  day: string;
  title: string;
  note: string;
  time: string;
};

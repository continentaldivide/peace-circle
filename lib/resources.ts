/**
 * The composer's shared rules: what a new share carries, what counts as enough
 * to post one, and what trying comes back as.
 *
 * Separate from `app/actions/resources.ts` because a `"use server"` module may
 * only export async functions — exporting the constants from there fails at
 * module evaluation with "can only export async functions, found object". Same
 * arrangement as lib/inquiries.ts and its action, and for the same second
 * reason: the form and the action run the same rules, from one place, so the
 * browser and the server can never disagree about what may be posted.
 */

import type { ResourceKind } from "@/lib/data/types";
import { isImageObjectName } from "@/lib/images";

/**
 * Everything the composer collects, across every kind — one flat draft rather
 * than four shapes, because the sheet keeps what you typed when you change
 * your mind about the chips. Which of these fields a kind actually stores is
 * settled once, in `toResourceInsert`.
 */
export type ResourceField =
  | "quote"
  | "attribution"
  | "title"
  | "url"
  | "bookAuthor"
  /** The free text every kind has room for: a quote's note, a link's or a
   *  book's description, a picture's caption. All four land in `body`. */
  | "note";

export const RESOURCE_FIELDS: readonly ResourceField[] = [
  "quote",
  "attribution",
  "title",
  "url",
  "bookAuthor",
  "note",
];

/**
 * An uploaded picture, as the composer hands it to the action.
 *
 * A path, not a file. The browser puts the bytes in Storage itself — its
 * session is what the storage policies check — so what crosses into the action
 * is a name and the shape of what is behind it.
 */
export type DraftImage = {
  path: string;
  width: number;
  height: number;
};

export type ResourceDraft = {
  kind: ResourceKind;
  /** Present only when a picture was uploaded before posting. Optional
   *  because a picture share with no photo is an ordinary share. */
  image?: DraftImage;
} & Record<ResourceField, string>;

export const emptyResourceDraft: ResourceDraft = {
  kind: "quote",
  quote: "",
  attribution: "",
  title: "",
  url: "",
  bookAuthor: "",
  note: "",
};

export type ResourceErrors = Partial<Record<ResourceField, string>>;

/** What posting a share comes back as. The id is what the composer opens. */
export type ResourceResult =
  { status: "created"; id: string } | { status: "error"; formError: string };

/** What commenting on one comes back as. Nothing to return but the verdict:
 *  the saved comment arrives with the re-rendered page. */
export type CommentResult =
  { status: "added" } | { status: "error"; formError: string };

const KINDS: readonly ResourceKind[] = ["quote", "link", "picture", "book"];

/** What each kind cannot be posted without, in the order the sheet asks. */
const REQUIRED: Record<ResourceKind, readonly ResourceField[]> = {
  quote: ["quote"],
  link: ["title", "url"],
  picture: ["title"],
  book: ["title"],
};

const MISSING: ResourceErrors = {
  quote: "Please write the line you'd like to pass along.",
  title: "Please give it a title.",
  url: "Please add the web address.",
};

/** Shorter than this is a slip of the keyboard rather than a quote. */
const QUOTE_MIN = 4;

/**
 * The draft as it arrives from the browser, checked rather than assumed.
 *
 * A Server Action is a public entry point: anyone can POST one a shape of
 * their choosing, and the parameter's TypeScript type is erased long before
 * the request arrives. Without this, an unknown `kind` walks into a lookup
 * that returns undefined and the action fails as a 500 instead of a sentence.
 */
export function isResourceDraft(value: unknown): value is ResourceDraft {
  if (typeof value !== "object" || value === null) return false;
  const draft = value as Record<string, unknown>;
  if (!KINDS.includes(draft.kind as ResourceKind)) return false;
  if (draft.image !== undefined && !isDraftImage(draft.image)) return false;
  return RESOURCE_FIELDS.every((field) => typeof draft[field] === "string");
}

/** A sanity bound on a claimed picture's dimensions — far past any camera, and
 *  short of the numbers that make a reserved aspect box absurd. */
const MAX_DIMENSION = 20000;

/**
 * The image half of the draft, checked the same way and for the same reason.
 *
 * Whether the path is *this member's* is the action's question, not this one's:
 * it takes the session, and this function does not. What is settled here is
 * that the path is shaped like something this app writes at all, so a name
 * with a traversal or a `.svg` on the end never reaches the column.
 */
function isDraftImage(value: unknown): value is DraftImage {
  if (typeof value !== "object" || value === null) return false;
  const image = value as Record<string, unknown>;
  if (typeof image.path !== "string" || !isImageObjectName(image.path)) {
    return false;
  }
  return [image.width, image.height].every(
    (n) =>
      Number.isSafeInteger(n) &&
      (n as number) > 0 &&
      (n as number) <= MAX_DIMENSION,
  );
}

/**
 * The web address as it should be stored, or null when it is not one.
 *
 * The field asks for "example.com/article", so a missing scheme is filled in
 * rather than refused — the form promises that shape and should keep it. Any
 * other scheme is turned away: the column is plain text, one member writes
 * this and another opens it, and `javascript:` is not an address but a script
 * someone else runs.
 *
 * A scheme is `something://`, not merely something before a colon. Testing for
 * a bare colon read the port in "example.com:8080/article" as a scheme named
 * "example.com", left the address unprefixed, and then refused it for not
 * being http — an error with nothing the member could do about it. Anything
 * else typed with a colon and no slashes is prefixed instead of trusted, and
 * what it becomes is refused below: "javascript:alert(1)" does not parse as a
 * host and port, and "mailto:someone@example.org" parses as credentials.
 */
export function normalizeUrl(value: string): string | null {
  const raw = value.trim();
  if (raw === "") return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // "https://notes" parses but goes nowhere anyone else can follow.
  if (!url.hostname.includes(".")) return null;
  // Credentials in an address are the shape a disguised link takes:
  // "https://peacecircle.org@somewhere-else.example" is a username and a
  // different host, and reads to a member as the site it names first.
  if (url.username !== "" || url.password !== "") return null;
  return url.href;
}

/**
 * Enough filled in to try — what the post button waits for.
 *
 * Deliberately not the same question as `validateResource`: a field can be
 * filled in and still be wrong, and a button that stays dead without saying
 * why is worse than one that answers. So presence disables it, and everything
 * else is explained beside the field it belongs to.
 */
export function isComplete(draft: ResourceDraft): boolean {
  return REQUIRED[draft.kind].every((field) => draft[field].trim() !== "");
}

/**
 * The rules, run by the composer to decide what to say and by the action
 * because a client can always be bypassed.
 */
export function validateResource(draft: ResourceDraft): ResourceErrors {
  const errors: ResourceErrors = {};

  for (const field of REQUIRED[draft.kind]) {
    if (draft[field].trim() === "") errors[field] = MISSING[field];
  }

  if (
    draft.kind === "quote" &&
    !errors.quote &&
    draft.quote.trim().length < QUOTE_MIN
  ) {
    errors.quote = MISSING.quote;
  }

  if (draft.kind === "link" && !errors.url && !normalizeUrl(draft.url)) {
    errors.url = "Please use a full web address, like example.com/article.";
  }

  return errors;
}

/**
 * Where a shared picture lives, and how the browser is told to fetch it.
 *
 * The `images` bucket is private (see
 * `supabase/migrations/20260916000001_library_images.sql`), so an object has no
 * URL anyone can be handed. What a card gets instead is a route of this app's
 * own, which checks the gate and streams the bytes. That means the address of a
 * picture is stable — the same path forever, cacheable by the browser — rather
 * than a signed URL that is different on every render and expires while a page
 * is still open.
 *
 * Pure, and shared by both sides: the route handler that serves an image, the
 * mapper that turns a row into a card, the action that checks a claimed path,
 * and the composer that uploads one all read the shape of an object name from
 * here rather than each spelling it out.
 */

/** The one bucket. Named here so no caller types the string. */
export const IMAGE_BUCKET = "images";

/**
 * An object name is `<author_id>/<uuid>.<ext>`. The first segment is what the
 * storage policies compare against `auth.uid()`, which is why the shape is a
 * rule rather than a convention — a name that does not match it is not
 * something this app wrote.
 */
const OBJECT_NAME =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

/** Extension to what it is served as. Also the allowlist: the served type is
 *  derived from the name rather than echoed from whatever was stored. */
const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** The format the composer encodes to, and its extension. */
export const UPLOAD_CONTENT_TYPE = "image/jpeg";
const UPLOAD_EXTENSION = "jpg";

/**
 * The longest edge a stored picture may have.
 *
 * Nothing optimizes these images — the route that serves them needs a session,
 * and Next's image optimizer fetches without one — so what is uploaded is what
 * every member downloads, and this number is the whole of the size question.
 * 1200 is about twice the detail sheet's width on a 2× screen, which is where a
 * photo is actually looked at; the cards over-fetch, and lazy loading means
 * they only do it for the ones on screen.
 */
export const IMAGE_MAX_EDGE = 1200;

/** JPEG quality for the re-encode. Visually clean; ~200 KB at the size above. */
export const IMAGE_QUALITY = 0.82;

/** Is this a name this app could have written? */
export function isImageObjectName(name: string): boolean {
  return OBJECT_NAME.test(name);
}

/**
 * Whose folder an object sits in, or null when the name is not one of ours.
 *
 * The storage policies already refuse a write outside your own folder. This is
 * for the other direction: an action is handed a path by a browser, and a path
 * that parses perfectly can still be somebody else's.
 */
export function imageObjectOwner(name: string): string | null {
  const match = OBJECT_NAME.exec(name);
  return match ? match[1].toLowerCase() : null;
}

/** What to serve an object as, or null when the name is not one of ours. */
export function imageContentType(name: string): string | null {
  const match = OBJECT_NAME.exec(name);
  return match ? CONTENT_TYPES[match[2].toLowerCase()] : null;
}

/** A new object name for this member's upload. `fileId` is a fresh uuid. */
export function imageObjectName(userId: string, fileId: string): string {
  return `${userId}/${fileId}.${UPLOAD_EXTENSION}`;
}

/** Where the browser fetches it: this app's route, never a storage URL. */
export function imageSrc(name: string): string {
  return `/api/images/${name}`;
}

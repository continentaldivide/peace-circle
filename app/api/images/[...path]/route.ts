import { getOwnProfile } from "@/lib/dal";
import {
  IMAGE_BUCKET,
  imageContentType,
  isImageObjectName,
} from "@/lib/images";
import { createClient } from "@/lib/supabase/server";

/**
 * Serves a shared picture out of the private `images` bucket.
 *
 * This route exists because the bucket is private. A public bucket would make
 * this file unnecessary and the gate meaningless — an object URL works for
 * anyone holding it, forever, with no session. The alternative that keeps the
 * bucket private is a signed URL minted per render, but a signed URL is a
 * different string every time, so the browser can never reuse what it already
 * has, and it expires while the page holding it is still open. A route of our
 * own gives one stable address per picture, checked on every request.
 *
 * The gate is checked twice over: here, so the answer is a 404 rather than a
 * redirect to a sign-in page rendered into an `<img>`, and again inside
 * Postgres, because this reads through the member's own session and
 * `images_select_members` is what actually returns the bytes.
 *
 * Not `requireApproved()`, which redirects — the right answer to an image
 * request from someone who may not have it is nothing at all. 404 rather than
 * 403, so the response does not confirm that a picture exists to someone who
 * is not allowed to know.
 *
 * Nothing optimizes what this returns: `next/image`'s optimizer fetches the
 * `src` without forwarding the request's headers, so it arrives here with no
 * session and gets the 404 everyone else does. That is why pictures are drawn
 * `unoptimized` and scaled down before they are ever uploaded.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const notFound = () => new Response(null, { status: 404 });

  // Checked before anything is looked up, and checked as a whole name rather
  // than segment by segment: `isImageObjectName` accepts only
  // `<uuid>/<uuid>.<ext>`, so a traversal, a nested name, or an extension that
  // is a document rather than a picture never reaches storage.
  const name = (await params).path.join("/");
  if (!isImageObjectName(name)) return notFound();

  const profile = await getOwnProfile();
  if (!profile || profile.status !== "approved") return notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .download(name);

  if (error || !data) {
    // A missing object is ordinary — a share whose file was moderated away, or
    // a stale page — so this is a warning, not an error. It is also the only
    // record of it: the member just sees a picture that does not load.
    console.warn(`[images] could not read ${name}: ${error?.message}`);
    return notFound();
  }

  return new Response(data, {
    headers: {
      // From the name, not from the stored metadata, so what is served is
      // always one of the three types the name is allowed to end in.
      "Content-Type": imageContentType(name)!,
      "Content-Length": String(data.size),
      // The name carries a uuid and nothing overwrites an object, so this
      // address means one picture forever. `private` because the response is
      // for this member: a shared cache must not keep it for the next request
      // that comes along without a session.
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

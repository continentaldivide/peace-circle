import { NextResponse } from "next/server";

/**
 * The two things both email-link landing routes have to get right.
 *
 * `/auth/callback` handles the magic link's PKCE code and `/auth/confirm`
 * handles an invite's token hash, but each one ends the same way: a session
 * has just been written to cookies, and the next thing that happens is a
 * redirect to a path that came out of a URL. Getting either half wrong hands
 * that session to somebody else, so they live in one place.
 */

/**
 * Redirect with a *relative* Location.
 *
 * Deliberately not NextResponse.redirect(), which needs an absolute URL: both
 * `request.url` and `request.nextUrl` report the dev server's canonical host
 * rather than the one actually browsed, so a visitor on 127.0.0.1 would be
 * sent to localhost. Those are separate cookie origins, and the session just
 * written would not travel to the destination — landing an authenticated
 * member back on /signin. A relative Location keeps them on whichever host
 * they came in on.
 */
export function relativeRedirect(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

/**
 * Stands in for this site when resolving `next`. Only its origin matters: a
 * path that resolves somewhere else against it would do the same against the
 * real host. `.invalid` is reserved, so it can never be a real site.
 */
const SELF = "http://self.invalid";

/**
 * `next` comes from the URL, so it is attacker-controlled. Anything that would
 * not keep the browser on this site is discarded.
 *
 * This asks the URL parser rather than matching characters, because browsers
 * clean an address up before following it and a pattern cannot keep pace with
 * every way they do. The previous pattern refused `//evil.com` and
 * `/\evil.com` but let `/<tab>/evil.com` through — browsers delete tabs, so it
 * became the first. Parsing with the browser's own rules closes that whole
 * family at once.
 *
 * The check runs on the string actually returned, not on the input, because
 * serialising a parsed URL is itself a rewrite: `/.//evil.com` resolves safely
 * as given, but its pathname collapses to `//evil.com`, which does not.
 */
export function safeNext(next: string | null, fallback: string): string {
  if (!next?.startsWith("/")) return fallback;
  try {
    const url = new URL(next, SELF);
    // Serialised rather than passed through, so control characters arrive
    // percent-encoded instead of making the Location header throw.
    const path = url.pathname + url.search + url.hash;
    if (url.origin !== SELF || new URL(path, SELF).origin !== SELF) {
      return fallback;
    }
    return path;
  } catch {
    // Unparseable, such as `//[` — an invalid host.
    return fallback;
  }
}

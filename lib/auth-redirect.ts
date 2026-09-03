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
 * `next` comes from the URL, so it is attacker-controlled. Anything but a
 * single-slash relative path is discarded.
 *
 * The three shapes this refuses are all valid redirect targets to a browser:
 * `https://evil.com` obviously, `//evil.com` because a protocol-relative URL
 * is absolute, and `/\evil.com` because browsers normalise backslashes to
 * forward slashes before resolving — so it becomes the second case. Any of
 * them would send the freshly minted session to somebody else's site.
 */
export function safeNext(next: string | null, fallback: string): string {
  if (!next) return fallback;
  if (!/^\/($|[^/\\])/.test(next)) return fallback;
  return next;
}

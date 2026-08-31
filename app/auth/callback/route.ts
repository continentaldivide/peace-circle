import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Where a magic link lands. Supabase sends the browser here with a one-time
 * `code`, which this exchanges for a session and writes to cookies.
 *
 * Note what this route does *not* do: decide whether the person is allowed in.
 * It only establishes who they are. Authorization happens one hop later, when
 * the destination page calls `requireApproved()` — so a stranger who requests a
 * magic link for their own address gets a valid session and a redirect to
 * `/pending`, exactly as intended.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  // Supabase reports a rejected or expired link as query params rather than an
  // HTTP error, so this is the failure path for an old link in an inbox.
  const authError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (authError) {
    return redirect(`/signin?error=${encodeURIComponent(authError)}`);
  }

  if (!code) {
    return redirect("/signin?error=missing-code");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirect(`/signin?error=${encodeURIComponent(error.message)}`);
  }

  return redirect(safeNext(searchParams.get("next")));
}

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
function redirect(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

/**
 * `next` comes from the URL, so it is attacker-controlled. Anything other than
 * a single-slash relative path is discarded: `//evil.com` and
 * `https://evil.com` are both valid redirect targets to a browser, and either
 * would hand the freshly minted session to somebody else's site.
 */
function safeNext(next: string | null): string {
  if (!next) return "/home";
  if (!next.startsWith("/") || next.startsWith("//")) return "/home";
  return next;
}

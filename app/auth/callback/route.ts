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
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Supabase reports a rejected or expired link as query params rather than an
  // HTTP error, so this is the failure path for an old link in an inbox.
  const authError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (authError) {
    return NextResponse.redirect(
      `${origin}/signin?error=${encodeURIComponent(authError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=missing-code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/signin?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}${safeNext(searchParams.get("next"))}`,
  );
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

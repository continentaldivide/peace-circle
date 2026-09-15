import { type NextRequest } from "next/server";

import { relativeRedirect, safeNext } from "@/lib/auth-redirect";
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
 *
 * `next` is how the launch code survives the round trip through an inbox, so a
 * URL here can carry two different `code`s: Supabase's one-time PKCE code in
 * the query, and the launch code inside `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  // Supabase reports a rejected or expired link as query params rather than an
  // HTTP error, so this is the failure path for an old link in an inbox.
  const authError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (authError) {
    return relativeRedirect(`/signin?error=${encodeURIComponent(authError)}`);
  }

  if (!code) {
    return relativeRedirect("/signin?error=missing-code");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return relativeRedirect(
      `/signin?error=${encodeURIComponent(error.message)}`,
    );
  }

  return relativeRedirect(safeNext(searchParams.get("next"), "/home"));
}

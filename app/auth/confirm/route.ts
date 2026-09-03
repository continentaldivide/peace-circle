import { type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { relativeRedirect, safeNext } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Where an invite link lands.
 *
 * A separate route from `/auth/callback` because an invite is a different
 * thing arriving. A magic link is requested by the person themselves, from a
 * browser, so `@supabase/ssr` starts a PKCE exchange and the link comes back
 * carrying a one-time `code`. An invite is created by an admin calling
 * `inviteUserByEmail` — there is no browser in that request and so no PKCE
 * flow to complete. Supabase's own verify endpoint would resolve such a link
 * into an implicit-flow redirect, with the tokens in the URL *fragment*, which
 * is never sent to a server and so can never become a cookie here.
 *
 * The fix is the one Supabase's server-side auth guide prescribes: point the
 * email template at our own route and hand it the token hash directly, which
 * `verifyOtp` turns into a session. See `supabase/templates/invite.html` for
 * the link, and note that the *hosted* project needs the same template set in
 * its dashboard — config.toml only describes the local stack.
 *
 * This route must also be a Route Handler rather than anything the /welcome
 * page does itself: establishing a session means writing cookies, and a server
 * component renders after headers are sent, so its cookie writes are silently
 * dropped (see the `setAll` catch in lib/supabase/server.ts). The session
 * would appear to work and then be gone on the next request.
 *
 * Like `/auth/callback`, this only establishes *who* someone is. Authorization
 * is still the destination page's job.
 */

/**
 * The link types this app actually sends. Narrow on purpose: `type` comes out
 * of the URL, and there is no reason to let a hand-made link drive a flow we
 * never mail anybody, such as a password recovery in an app with no passwords.
 */
const ACCEPTED: readonly EmailOtpType[] = ["invite", "magiclink"];

function accepted(type: string | null): type is EmailOtpType {
  return !!type && (ACCEPTED as readonly string[]).includes(type);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const authError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (authError) {
    return relativeRedirect(`/signin?error=${encodeURIComponent(authError)}`);
  }

  if (!tokenHash || !accepted(type)) {
    return relativeRedirect("/signin?error=missing-token");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  // An invite is one-time and expiring, so this is the ordinary path for a
  // link that was already used or left too long in an inbox.
  if (error) {
    return relativeRedirect(
      `/signin?error=${encodeURIComponent(error.message)}`,
    );
  }

  // /welcome rather than /home: an invited person still has a name to confirm
  // and a tint to choose. Their profile already exists and is approved, so
  // /welcome shows them the finish step and nothing else.
  return relativeRedirect(safeNext(searchParams.get("next"), "/welcome"));
}

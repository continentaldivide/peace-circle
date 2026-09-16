import { type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { relativeRedirect, safeNext } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Where every emailed link lands: invites, and sign-in links.
 *
 * Each email template hands this route a token hash directly, which
 * `verifyOtp` turns into a session — the pattern Supabase's server-side auth
 * guide prescribes. The alternative, Supabase's default links, go through its
 * own `/auth/v1/verify` first, and that is wrong for both kinds of email:
 *
 * - An invite is created by an admin calling `inviteUserByEmail`, with no
 *   browser and so no PKCE flow. Supabase's verify endpoint resolves such a
 *   link into an implicit-flow redirect, with the tokens in the URL
 *   *fragment*, which is never sent to a server and so can never become a
 *   cookie here.
 * - A sign-in link would work, but it points at `supabase.co` in mail sent
 *   from our own domain, and spam filters read that mismatch as phishing. The
 *   first real launch-code signup went to spam for it.
 *
 * A token hash also needs no PKCE verifier from the browser that asked, so a
 * link requested on a laptop can be opened on a phone.
 *
 * See `supabase/templates/` for the links, and note that the *hosted* project
 * needs the same templates set in its dashboard — config.toml only describes
 * the local stack. `/auth/callback` remains only for sign-in links mailed
 * before this route handled them.
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
 *
 * `email` covers both sign-in emails, "Magic Link" and "Confirm signup":
 * Supabase picks which one to send, and verifies either under this type.
 */
const ACCEPTED: readonly EmailOtpType[] = ["invite", "email"];

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

  // Sign-in links always carry `next`, so this fallback is an invite's.
  // /welcome rather than /home: an invited person still has a name to confirm
  // and a tint to choose. Their profile already exists and is approved, so
  // /welcome shows them the finish step and nothing else.
  return relativeRedirect(safeNext(searchParams.get("next"), "/welcome"));
}

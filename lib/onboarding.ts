import "server-only";

import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/**
 * The launch-code half of onboarding.
 *
 * Thin on purpose: all of the thinking is in the `redeem_launch_code` Postgres
 * function, which takes a row lock on the code so the cap check and the
 * increment cannot be separated, and runs `security definer` because
 * `launch_codes` is admin-only in RLS and `profiles` has no insert policy at
 * all. See supabase/migrations/*_launch_code_redemption.sql.
 *
 * That is also why this app has no use for the service-role key yet. Step 7's
 * invites will be the first thing that needs one.
 */

export type LaunchCodeOutcome =
  Database["public"]["Enums"]["launch_code_outcome"];

/** Outcomes that mean the person is on the roster when this returns. */
export type LaunchCodeRefusal = Exclude<
  LaunchCodeOutcome,
  "redeemed" | "already_member"
>;

export async function redeemLaunchCode(
  code: string,
): Promise<LaunchCodeOutcome> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_launch_code", {
    p_code: code,
  });

  // A refused code is a returned value, not an error, so anything here is the
  // database being unreachable or the grant having been changed. Throwing
  // rather than reporting "that code didn't work" keeps the two apart: one is
  // something the visitor can act on, the other is not.
  if (error) {
    throw new Error(`Could not redeem a launch code: ${error.message}`);
  }

  return data;
}

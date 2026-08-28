import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Supabase client for client components — sign-in forms and anything else that
 * has to talk to the auth server from the browser.
 *
 * It carries only the publishable key, so it is safe to ship to the browser:
 * every query it makes is still filtered by RLS. It is never the access gate.
 * The gate is `requireApproved()` in `lib/dal.ts`, plus the policies behind it.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL(), SUPABASE_PUBLISHABLE_KEY());
}

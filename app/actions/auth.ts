"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Sign out and return to the landing page.
 *
 * A server action rather than a browser-side `signOut()` so the auth cookies
 * are cleared on the response itself: server actions can write cookies, which
 * is the case `lib/supabase/server.ts` keeps its `setAll` for.
 */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * The Data Access Layer — the server-side half of the access gate.
 *
 * Two layers, deliberately separate (see PLAN.md, "Member sign-up &
 * onboarding"). Authentication proves you own an email address and grants
 * nothing on its own; authorization requires an `approved` profile. Anyone can
 * request a magic link, so `verifySession()` succeeding means very little —
 * `requireApproved()` is the check that matters.
 *
 * This is not the only gate. RLS enforces the same rule inside Postgres, so a
 * page that forgets to call `requireApproved()` leaks nothing: its queries come
 * back empty. This layer exists to turn that silence into a redirect a member
 * can understand.
 *
 * Every function is wrapped in React `cache()` so a page that checks the gate
 * and then reads data does one round trip per render, not several.
 */

/** A member's own profile row, as the gate reads it. */
export type Profile = {
  id: string;
  name: string;
  role: string;
  status: "approved" | "revoked";
  is_admin: boolean;
  avatar_tint: string | null;
};

export type Session = {
  userId: string;
  email?: string;
};

/**
 * Who is signed in, or null. Reads verified JWT claims rather than
 * `getSession()`, whose user object the Supabase docs warn must not be trusted
 * server-side — it comes from a cookie the browser could have edited.
 */
export const verifySession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) return null;

  return { userId: data.claims.sub, email: data.claims.email };
});

/** Signed in, or sent to sign in. Identity only — grants no access to content. */
export const requireSession = cache(async (): Promise<Session> => {
  const session = await verifySession();
  if (!session) redirect("/signin");
  return session;
});

/**
 * The gate every member page calls before rendering anything.
 *
 * Deliberately a *page*-level call, not a layout one: layouts do not re-render
 * on client-side navigation under Partial Rendering, so a check placed there
 * would pass once and then be skipped for the rest of the session.
 */
export const requireApproved = cache(
  async (): Promise<Session & { profile: Profile }> => {
    const session = await requireSession();
    const supabase = await createClient();

    // Readable even when un-approved: the profiles policy lets you see your own
    // row either way, which is how /pending can tell a signed-in stranger they
    // are not on the roster instead of showing them a bare error.
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, role, status, is_admin, avatar_tint")
      .eq("id", session.userId)
      .maybeSingle<Profile>();

    // No row means someone authenticated who was never invited and never
    // redeemed a launch code. `revoked` means a former member. Both land on the
    // same screen; neither is an error.
    if (!profile || profile.status !== "approved") redirect("/pending");

    return { ...session, profile };
  },
);

/** For admin-only surfaces (the inquiry queue, moderation, event management). */
export const requireAdmin = cache(
  async (): Promise<Session & { profile: Profile }> => {
    const member = await requireApproved();
    if (!member.profile.is_admin) redirect("/home");
    return member;
  },
);

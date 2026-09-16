"use server";

import { redirect } from "next/navigation";

import { requireApproved } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { ProfileState, ProfileValues } from "@/lib/welcome";
import { validateProfile } from "@/lib/welcome";

/**
 * The last step of onboarding: confirm the display name, choose an avatar
 * tint, and land on Member Home.
 *
 * An ordinary update, deliberately. `profiles_update_self` already allows a
 * member to edit their own row, and the `profiles_guard_privileges` trigger
 * already reverts any attempt to change `status`, `role`, or `is_admin`
 * through that route — so this needs no elevated rights, and the two columns
 * it writes are the two it is allowed to write.
 */
export async function finishProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const name = String(formData.get("name") ?? "").trim();
  const tint = String(formData.get("tint") ?? "").trim();
  const values: ProfileValues = { name, tint };

  // Re-run rather than trusted from the client, which can be bypassed. Same
  // rules the form uses, from the same module.
  const errors = validateProfile(values);
  if (Object.keys(errors).length > 0) {
    console.warn(
      `[welcome] rejected a profile the form would not have sent: ${Object.keys(errors).join(", ")}`,
    );
    return {
      status: "error",
      formError: "Some of that wasn't quite right. Please try again.",
    };
  }

  // Checked here as well as by the page that renders the form. The Next.js
  // guide is explicit that a Server Action is its own entry point and must
  // verify for itself, even when the only form that calls it sits behind a
  // gate — the action is reachable without the page.
  const { userId } = await requireApproved();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ name, avatar_tint: tint })
    .eq("id", userId);

  if (error) {
    // The member sees one sentence, so this line is the only record that a
    // profile was not finished — and the only way to tell a transient failure
    // apart from a drift between validateProfile and the column constraints,
    // which names itself in the code.
    console.error(
      `[welcome] could not finish profile ${userId}: ${error.code} ${error.message}`,
    );
    return {
      status: "error",
      formError:
        "Something went wrong saving that. Please try again in a moment.",
    };
  }

  // Outside any try/catch: redirect works by throwing, and catching it here
  // would turn a successful save into a form error.
  redirect("/home");
}

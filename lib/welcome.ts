/**
 * /welcome's shared rules: the avatar tints on offer, and what counts as a
 * finished profile.
 *
 * Separate from `app/actions/welcome.ts` for the same reason lib/inquiries.ts
 * is separate from its action — a `"use server"` module may only export async
 * functions, and exporting a constant from one fails at module evaluation
 * rather than at build. The name rule itself comes from lib/validation.ts, so
 * the interest form and this step cannot drift apart about what a name is.
 */

import { nameError } from "@/lib/validation";

/**
 * The tints someone may choose for their avatar.
 *
 * Six-digit lowercase hex, because that is exactly what the
 * `profiles_avatar_tint_hex` check constraint permits — the column feeds a CSS
 * `background`, so it is deliberately narrow.
 *
 * Chosen to be told apart at a glance, which the first palette was not: it was
 * six olives and khakis, the closest two a CIE76 ΔE of 2.5 apart — about the
 * smallest difference anyone notices — and four of them too light for the
 * white initials `Avatar` draws on top. These six keep the site's earthy,
 * muted character but sit at different hues *and* lightnesses, so they stay
 * distinct for the one member in twelve or so with red–green colour
 * blindness, where hue alone collapses:
 *
 * - closest pair, normal vision: ΔE 23 (Moss / Bark)
 * - closest pair, simulated deuteranopia or protanopia: ΔE 12.8
 * - every tint at least 4.5:1 against white, the WCAG AA bar for text
 *
 * Changing a value here orphans every profile that stored the old one — it
 * still renders, but the picker no longer shows it as chosen. Move stored
 * values in a migration alongside, as `20260916000005_distinct_avatar_tints`
 * did for this palette.
 */
export const AVATAR_TINTS = [
  { value: "#4f5b2b", label: "Moss" },
  { value: "#1d5b5d", label: "Lake" },
  { value: "#2d4668", label: "Dusk" },
  { value: "#8b5a87", label: "Plum" },
  { value: "#a95d4f", label: "Clay" },
  { value: "#4b3a26", label: "Bark" },
] as const;

export type AvatarTint = (typeof AVATAR_TINTS)[number]["value"];

/** Mirrors the `profiles_name_length` constraint, and INQUIRY_LIMITS.name. */
export const PROFILE_NAME_LIMIT = 100;

export function isAvatarTint(value: string): value is AvatarTint {
  return AVATAR_TINTS.some((tint) => tint.value === value);
}

export type ProfileField = "name" | "tint";
export type ProfileValues = Record<ProfileField, string>;

export type ProfileState = {
  status: "idle" | "error";
  formError?: string;
};

export const initialProfileState: ProfileState = { status: "idle" };

/**
 * The rules, run by the form to decide whether it may submit and by the action
 * because a client can always be bypassed.
 *
 * There is no "sent" state to go with this: finishing a profile ends in a
 * redirect to /home, so the only thing the form ever renders from the action
 * is a failure.
 */
export function validateProfile(
  values: ProfileValues,
): Partial<Record<ProfileField, string>> {
  const errors: Partial<Record<ProfileField, string>> = {};

  const name = nameError(values.name);
  if (name) {
    errors.name = name;
  } else if (values.name.trim().length > PROFILE_NAME_LIMIT) {
    errors.name = `Please keep this under ${PROFILE_NAME_LIMIT} characters.`;
  }

  // Not a formatting rule but a membership one: the value must be one of the
  // six we offer, checked here as well as by the check constraint, so a
  // bypassed client gets a sentence rather than a database error.
  if (!isAvatarTint(values.tint)) {
    errors.tint = "Please choose one of the colours.";
  }

  return errors;
}

/**
 * The four design options the prototype lets reviewers compare. Each is the
 * *same* app themed differently; the active key lives in the URL segment
 * (`/option-a/…`) and drives `data-variant` on the app root, which selects the
 * token set + the per-variant treatment overrides.
 *
 * Client-safe: keys + labels only, no components.
 */
export const VARIANTS = [
  { key: "option-a", label: "Option A" },
  { key: "option-b", label: "Option B" },
  { key: "option-c", label: "Option C" },
  { key: "option-d", label: "Option D" },
] as const;

export type VariantKey = (typeof VARIANTS)[number]["key"];

export const VARIANT_KEYS = VARIANTS.map((v) => v.key) as VariantKey[];

/** The option a bare `/` visit lands on. */
export const DEFAULT_VARIANT: VariantKey = "option-a";

export function isVariant(value: string): value is VariantKey {
  return VARIANT_KEYS.includes(value as VariantKey);
}

/** Build a path within an option, e.g. variantPath("option-a", "/library"). */
export function variantPath(variant: VariantKey, path = ""): string {
  return `/${variant}${path}`;
}

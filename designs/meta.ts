/**
 * Client-safe metadata for the design variants: just keys + labels, no page
 * components. The prototype switcher imports this so it doesn't pull every
 * design's component tree into the client bundle. The full registry (with
 * components) lives in `registry.ts` and is server-only.
 */
export const DESIGN_META = [
  { key: "d1", label: "Design 1" },
  { key: "d2", label: "Design 2" },
] as const;

export type DesignKey = (typeof DESIGN_META)[number]["key"];

export const DESIGN_KEYS = DESIGN_META.map((d) => d.key) as DesignKey[];

/** The design a bare `/` visit lands on. */
export const DEFAULT_DESIGN: DesignKey = "d1";

export function isDesignKey(value: string): value is DesignKey {
  return DESIGN_KEYS.includes(value as DesignKey);
}

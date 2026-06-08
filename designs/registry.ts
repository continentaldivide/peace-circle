import { notFound } from "next/navigation";

import * as Design1 from "@/designs/design1";
import * as Design2 from "@/designs/design2";
import { DESIGN_META, isDesignKey, type DesignKey } from "@/designs/meta";
import type { DesignPages } from "@/designs/types";

/**
 * Server-only registry mapping each design key to its page component set.
 * Route segments resolve the active design's pages from here. Adding a design
 * is two lines: an import + an entry below (plus a row in `meta.ts`).
 *
 * The switcher should import from `meta.ts`, not here — importing this module
 * pulls every design's component tree into the bundle.
 */
export const DESIGNS: Record<DesignKey, { label: string; pages: DesignPages }> =
  {
    d1: { label: "Design 1", pages: Design1 },
    d2: { label: "Design 2", pages: Design2 },
  };

// Keep the registry and the metadata table in lockstep.
const _metaKeys = DESIGN_META.map((d) => d.key)
  .sort()
  .join(",");
const _registryKeys = Object.keys(DESIGNS).sort().join(",");
if (_metaKeys !== _registryKeys) {
  throw new Error(
    `Design registry/meta mismatch: meta=[${_metaKeys}] registry=[${_registryKeys}]`,
  );
}

/**
 * Resolve the page set for a route segment, or render a 404 for an unknown
 * design (e.g. someone typing `/d9/feed`). Call this from `[design]` pages.
 */
export function getDesignPages(design: string): DesignPages {
  if (!isDesignKey(design)) notFound();
  return DESIGNS[design].pages;
}

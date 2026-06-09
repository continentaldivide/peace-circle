"use client";

import { createContext, useContext, useEffect } from "react";

import type { VariantKey } from "@/lib/variants";

/**
 * The URL segment (`/option-a`, `/option-c`, …) is the source of truth for the
 * active variant and drives `data-variant`. This context just makes that value
 * available to client components without prop-drilling. The server layout reads
 * the segment and feeds it in.
 */
const VariantContext = createContext<VariantKey | null>(null);

export function VariantProvider({
  variant,
  children,
}: {
  variant: VariantKey;
  children: React.ReactNode;
}) {
  // Mirror the active variant onto <html> so the theme tokens reach content
  // that Headless UI portals to document.body (dialogs, menus) — which lives
  // outside the themed wrapper and otherwise can't see the scoped tokens.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-variant", variant);
    return () => root.removeAttribute("data-variant");
  }, [variant]);

  return (
    <VariantContext.Provider value={variant}>
      {children}
    </VariantContext.Provider>
  );
}

export function useVariant(): VariantKey {
  const variant = useContext(VariantContext);
  if (!variant) {
    throw new Error("useVariant must be used within a VariantProvider");
  }
  return variant;
}

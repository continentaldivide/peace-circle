"use client";

import { createContext, useContext } from "react";

import type { DesignKey } from "@/designs/meta";

/**
 * The URL segment (`/d1`, `/d2`) is the source of truth for the active design.
 * This context just makes that value available to client components nested in
 * the design layout without prop-drilling. The server layout reads the segment
 * and feeds it in.
 */
const DesignContext = createContext<DesignKey | null>(null);

export function DesignProvider({
  design,
  children,
}: {
  design: DesignKey;
  children: React.ReactNode;
}) {
  return (
    <DesignContext.Provider value={design}>{children}</DesignContext.Provider>
  );
}

export function useDesign(): DesignKey {
  const design = useContext(DesignContext);
  if (!design) {
    throw new Error("useDesign must be used within a DesignProvider");
  }
  return design;
}

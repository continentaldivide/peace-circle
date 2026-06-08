"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DESIGN_META, type DesignKey } from "@/designs/meta";
import { cn } from "@/lib/utils";

/**
 * Prototype-only scaffold. Deliberately styled to read as a tool, not a product
 * feature, so Gail reviews the designs — not the switcher. Switching rewrites
 * only the leading design segment of the URL, preserving the rest of the path
 * (so `/d2/calendar` → `/d1/calendar`, not back to the feed).
 */
export function PrototypeBar({ currentDesign }: { currentDesign: DesignKey }) {
  const pathname = usePathname();
  const currentLabel =
    DESIGN_META.find((d) => d.key === currentDesign)?.label ?? currentDesign;

  function hrefForDesign(key: DesignKey) {
    const segments = pathname.split("/");
    // segments = ["", "<design>", ...rest]; swap the design segment in place.
    segments[1] = key;
    return segments.join("/") || "/";
  }

  return (
    <div className="flex items-center gap-3 border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <span className="font-medium">Prototype — viewing {currentLabel}</span>
      <span className="text-amber-700/70">·</span>
      <div className="flex items-center gap-1">
        {DESIGN_META.map((d) => {
          const active = d.key === currentDesign;
          return (
            <Link
              key={d.key}
              href={hrefForDesign(d.key)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                active
                  ? "bg-amber-900 text-amber-50"
                  : "text-amber-800 hover:bg-amber-200",
              )}
            >
              {d.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

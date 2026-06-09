"use client";

import { KIND_FILTERS } from "@/components/library/kinds";
import { cn } from "@/lib/utils";
import type { ResourceKind } from "@/lib/data";

type Filter = ResourceKind | "all";

export function FilterBar({
  active,
  counts,
  onPick,
}: {
  active: Filter;
  counts: Record<Filter, number>;
  onPick: (id: Filter) => void;
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-[9px]">
      {KIND_FILTERS.map((k) => {
        const on = active === k.id;
        return (
          <button
            key={k.id}
            role="tab"
            aria-selected={on}
            onClick={() => onPick(k.id)}
            className={cn(
              "rounded-chip border px-[15px] py-2 font-body text-[14px] font-medium transition-colors option-d:font-semibold",
              on
                ? "border-accent bg-accent text-accent-ink"
                : "border-line-strong bg-surface text-ink-soft hover:text-ink",
            )}
          >
            {k.label}
            {counts[k.id] > 0 ? (
              <span
                className={cn(
                  "ml-1.5 text-[12px]",
                  on ? "opacity-80" : "text-faint",
                )}
              >
                {counts[k.id]}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

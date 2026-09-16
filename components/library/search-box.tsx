"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { libraryHref } from "@/lib/search";
import { cn } from "@/lib/utils";

/** Long enough that a phrase is typed out, short enough to feel immediate. */
const DEBOUNCE_MS = 250;

/**
 * The Library's search field — the other half of the filter bar.
 *
 * What it does is navigate. The query lives in `?q=`, the page reads it on the
 * server and asks the database, and the results arrive as new props, exactly as
 * they do after a share is posted. Nothing is filtered in the browser here: the
 * text search runs against a GIN index over every share, including ones this
 * page never received.
 *
 * `replace`, not `push`, so a search does not leave one history entry per
 * keystroke to back out through — and `scroll: false`, because being thrown to
 * the top of the page while typing is disorienting.
 */
export function SearchBox({ query }: { query: string }) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [pending, startTransition] = useTransition();

  // The query this box last asked for. It is what tells a URL change made
  // *here* from one made by the back button: after our own navigation lands,
  // the incoming `query` matches this and the box leaves what is typed alone;
  // a query that arrives without matching came from somewhere else, and the
  // box follows it. Without the distinction, syncing from the prop would undo
  // keystrokes made while a navigation was in flight.
  const asked = useRef(query);

  useEffect(() => {
    if (query === asked.current) return;
    asked.current = query;
    setValue(query);
  }, [query]);

  useEffect(() => {
    if (value === asked.current) return;
    const timer = setTimeout(() => {
      asked.current = value;
      startTransition(() => {
        router.replace(libraryHref(value), { scroll: false });
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, router]);

  return (
    <div className="relative min-w-[200px] flex-1 sm:max-w-[320px]">
      <label className="sr-only" htmlFor="library-search">
        Search the Library
      </label>
      <svg
        aria-hidden="true"
        width="15"
        height="15"
        viewBox="0 0 15 15"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
      >
        <circle
          cx="6.5"
          cy="6.5"
          r="4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M10 10l3 3"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
      <input
        id="library-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search the Library"
        className={cn(
          "w-full rounded-chip border border-line-strong bg-surface py-2 pl-9 pr-9",
          "font-body text-[14px] text-ink outline-none transition-colors",
          "placeholder:text-faint focus:border-accent",
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear the search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-full px-1.5 py-0.5 font-body text-[14px] text-faint transition-colors hover:text-ink"
        >
          ×
        </button>
      ) : null}
      {/* Announced rather than drawn: the results below are the real feedback,
          and a spinner over a 250ms debounce reads as flicker. */}
      <span aria-live="polite" className="sr-only">
        {pending ? "Searching…" : null}
      </span>
    </div>
  );
}

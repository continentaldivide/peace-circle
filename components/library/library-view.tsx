"use client";

import { useMemo, useState } from "react";

import { Composer } from "@/components/library/composer";
import { FilterBar } from "@/components/library/filter-bar";
import type { AuthorInfo } from "@/components/library/kinds";
import { ResourceCard } from "@/components/library/resource-card";
import { ResourceDetail } from "@/components/library/resource-detail";
import { MemberNav } from "@/components/member-nav";
import { RingMark } from "@/components/ring-mark";
import { Button } from "@/components/ui/button";
import type { Member, Resource, ResourceKind } from "@/lib/data";

type Filter = ResourceKind | "all";

export function LibraryView({
  user,
  now,
  resources,
  members,
}: {
  user: Member;
  /** ISO instant the page was rendered at; see `lib/time.ts`. */
  now: string;
  /**
   * The Library as the server has it. Not copied into state: a new share or
   * comment ends in `refresh()`, which re-renders this page and arrives as new
   * props — a copy seeded once would keep showing the list as it was.
   */
  resources: Resource[];
  members: Member[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const lookup = useMemo(() => {
    const map = new Map<string, AuthorInfo>();
    members.forEach((m) =>
      map.set(m.id, { name: m.name, initials: m.initials, tint: m.tint }),
    );
    return (id: string): AuthorInfo =>
      map.get(id) ?? {
        name: "A member",
        initials: "·",
        tint: "var(--ink-soft)",
      };
  }, [members]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: resources.length,
      quote: 0,
      link: 0,
      picture: 0,
      book: 0,
    };
    resources.forEach((r) => {
      c[r.kind] += 1;
    });
    return c;
  }, [resources]);

  const shown =
    filter === "all" ? resources : resources.filter((r) => r.kind === filter);
  const openRes = resources.find((r) => r.id === openId) ?? null;

  // The share is already saved and already in `resources` by the time this
  // runs — the composer calls it with the re-rendered page in hand.
  function openCreated(id: string) {
    setComposing(false);
    setOpenId(id);
  }

  return (
    <>
      <MemberNav user={user} />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-6 py-10 sm:px-10">
        <h1 className="font-display text-[40px] font-semibold leading-[1.04] tracking-[-0.015em] text-ink">
          The Library
        </h1>
        <p className="mt-1.5 max-w-[60ch] font-body text-[16px] leading-[1.5] text-ink-soft">
          Quotes, readings, and pictures the circle passes along between
          meetings.
        </p>

        <div className="my-[18px] flex flex-wrap items-center justify-between gap-3">
          <FilterBar active={filter} counts={counts} onPick={setFilter} />
          <Button
            size="sm"
            onClick={() => setComposing(true)}
            className="flex-none"
          >
            <span aria-hidden="true">+</span>
            <span className="hidden sm:inline">Share something</span>
            <span className="sm:hidden">Share</span>
          </Button>
        </div>

        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="text-accent">
              <RingMark size={44} rings={4} />
            </span>
            <p className="font-body text-[15px] text-ink-soft">
              Nothing here yet.{" "}
              <button
                onClick={() => setComposing(true)}
                className="font-medium text-accent"
              >
                Share the first one.
              </button>
            </p>
          </div>
        ) : (
          <div className="columns-1 [column-gap:18px] sm:columns-2 lg:columns-3">
            {shown.map((r) => (
              <ResourceCard
                key={r.id}
                r={r}
                author={lookup(r.authorId)}
                now={now}
                onOpen={setOpenId}
              />
            ))}
          </div>
        )}
      </main>

      <ResourceDetail
        open={openId !== null}
        resource={openRes}
        user={user}
        now={now}
        lookup={lookup}
        onClose={() => setOpenId(null)}
      />
      <Composer
        open={composing}
        onClose={() => setComposing(false)}
        onCreated={openCreated}
      />
    </>
  );
}

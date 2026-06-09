"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Composer } from "@/components/library/composer";
import { FilterBar } from "@/components/library/filter-bar";
import type { AuthorInfo } from "@/components/library/kinds";
import { ResourceCard } from "@/components/library/resource-card";
import { ResourceDetail } from "@/components/library/resource-detail";
import { MemberNav } from "@/components/member-nav";
import { RingMark } from "@/components/ring-mark";
import { useSession } from "@/components/session";
import { useVariant } from "@/components/variant-context";
import { variantPath } from "@/lib/variants";
import type { Member, Resource, ResourceKind } from "@/lib/data";

type Filter = ResourceKind | "all";

export function LibraryView({
  initialResources,
  members,
}: {
  initialResources: Resource[];
  members: Member[];
}) {
  const { user, ready } = useSession();
  const variant = useVariant();
  const router = useRouter();

  // Approval/auth gate: no stub session → send to join. Phase 2 enforces the
  // real gate in RLS; this is the prototype's front-end stand-in.
  useEffect(() => {
    if (ready && !user) router.replace(variantPath(variant, "/join"));
  }, [ready, user, router, variant]);

  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const lookup = useMemo(() => {
    const map = new Map<string, AuthorInfo>();
    members.forEach((m) =>
      map.set(m.id, { name: m.name, initials: m.initials, tint: m.tint }),
    );
    if (user) {
      map.set("you", {
        name: user.name,
        initials: user.initials,
        tint: user.tint,
      });
    }
    return (id: string): AuthorInfo =>
      map.get(id) ?? {
        name: "A member",
        initials: "·",
        tint: "var(--ink-soft)",
      };
  }, [members, user]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: resources.length,
      quote: 0,
      link: 0,
      picture: 0,
      book: 0,
      event: 0,
    };
    resources.forEach((r) => {
      c[r.kind] += 1;
    });
    return c;
  }, [resources]);

  if (!ready || !user) return null;

  const shown =
    filter === "all" ? resources : resources.filter((r) => r.kind === filter);
  const openRes = resources.find((r) => r.id === openId) ?? null;

  function addResource(r: Resource) {
    setResources((prev) => [r, ...prev]);
    setComposing(false);
    setOpenId(r.id);
  }

  function addComment(id: string, body: string) {
    setResources((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              comments: [
                ...r.comments,
                {
                  id: "c" + Date.now(),
                  authorId: "you",
                  when: "just now",
                  body,
                },
              ],
            }
          : r,
      ),
    );
  }

  return (
    <>
      <MemberNav user={user} onCompose={() => setComposing(true)} />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-6 py-10 sm:px-10">
        <h1 className="font-display text-[40px] font-semibold leading-[1.04] tracking-[-0.015em] text-ink option-b:font-light option-d:font-extrabold">
          The Library
        </h1>
        <p className="mt-1.5 max-w-[60ch] font-body text-[16px] leading-[1.5] text-ink-soft">
          Quotes, readings, and pictures the circle passes along between
          meetings.
        </p>

        <div className="my-[18px]">
          <FilterBar active={filter} counts={counts} onPick={setFilter} />
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
        lookup={lookup}
        onClose={() => setOpenId(null)}
        onAddComment={addComment}
      />
      <Composer
        open={composing}
        user={user}
        onClose={() => setComposing(false)}
        onCreate={addResource}
      />
    </>
  );
}

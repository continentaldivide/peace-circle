"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { CircleChat } from "@/components/home/circle-chat";
import { MONTHS_SHORT, parseDate, startOfToday } from "@/components/home/dates";
import { MonthCalendar } from "@/components/home/month-calendar";
import { Composer } from "@/components/library/composer";
import type { AuthorInfo } from "@/components/library/kinds";
import { ResourceCard } from "@/components/library/resource-card";
import { ResourceDetail } from "@/components/library/resource-detail";
import { MemberNav } from "@/components/member-nav";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { useVariant } from "@/components/variant-context";
import { loadOlderMessages } from "@/app/actions/messages";
import { variantPath } from "@/lib/variants";
import type { CircleEvent, Member, MessagePage, Resource } from "@/lib/data";

const NUMBER_WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
];

const SECTION_TITLE =
  "font-display text-[18px] font-semibold text-ink option-b:font-normal option-d:font-bold option-d:tracking-[-0.01em]";

/** How many of the newest shares the "Just shared" rail surfaces. */
const RECENT_COUNT = 3;

function SectionHeader({
  title,
  more,
}: {
  title: string;
  more?: React.ReactNode;
}) {
  return (
    <div className="mb-3.5 flex items-baseline gap-2.5">
      <h2 className={SECTION_TITLE}>{title}</h2>
      {more ? <div className="ml-auto">{more}</div> : null}
    </div>
  );
}

export function HomeView({
  initialResources,
  members,
  messagePage,
  events,
}: {
  initialResources: Resource[];
  members: Member[];
  messagePage: MessagePage;
  events: CircleEvent[];
}) {
  const { user, ready } = useSession();
  const variant = useVariant();
  const router = useRouter();
  const p = (path = "") => variantPath(variant, path);

  // Same approval/auth gate as the Library: a cold visit with no stub session
  // is sent to /join. Phase 2 enforces this in RLS.
  const sawUser = useRef(false);
  useEffect(() => {
    if (user) {
      sawUser.current = true;
    } else if (ready && !sawUser.current) {
      router.replace(variantPath(variant, "/join"));
    }
  }, [ready, user, router, variant]);

  const [resources, setResources] = useState<Resource[]>(initialResources);
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

  const upcoming = useMemo(() => {
    const today = startOfToday();
    const dated = events
      .map((e) => ({ event: e, date: parseDate(e.date) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const ahead = dated.filter((e) => e.date >= today);
    return (ahead.length ? ahead : dated).slice(0, 3);
  }, [events]);

  if (!ready || !user) return null;

  const recent = resources.slice(0, RECENT_COUNT);
  const openRes = resources.find((r) => r.id === openId) ?? null;
  const firstName = user.name.split(/\s+/)[0];
  const next = upcoming[0];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const summary = (() => {
    const n = recent.length;
    const count = NUMBER_WORDS[n] ?? String(n);
    const shares = `${count} new ${n === 1 ? "share" : "shares"} since you last visited`;
    if (!next) return `${shares}.`;
    const days = Math.round(
      (next.date.getTime() - startOfToday().getTime()) / 86_400_000,
    );
    const when = days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
    const weekday = next.date.toLocaleDateString([], { weekday: "long" });
    return `${shares}, and ${weekday}'s circle is ${when}.`;
  })();

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
                { id: "c" + Date.now(), authorId: "you", when: "just now", body },
              ],
            }
          : r,
      ),
    );
  }

  return (
    <>
      <MemberNav user={user} />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 pb-12 pt-7 sm:px-10">
        <div className="mb-6 flex items-end justify-between gap-5">
          <div>
            <h1 className="font-display text-[30px] font-semibold tracking-[-0.01em] text-ink option-b:font-light option-d:font-extrabold option-d:tracking-[-0.02em]">
              {greeting}, {firstName}.
            </h1>
            <p className="mt-1.5 font-body text-[15px] text-ink-soft">
              {summary}
            </p>
          </div>
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

        <div className="grid grid-cols-1 items-start gap-[22px] min-[720px]:grid-cols-2 min-[1080px]:grid-cols-[0.95fr_1.25fr_1fr]">
          {/* Left — calendar + upcoming */}
          <div className="flex flex-col gap-[26px]">
            <section>
              <SectionHeader title="This month" />
              <MonthCalendar events={events} />
            </section>
            <section>
              <SectionHeader
                title="Upcoming"
                more={
                  <Link
                    href={p("/meetings")}
                    className="font-body text-[13px] font-medium text-ink-soft transition-colors hover:text-ink"
                  >
                    All →
                  </Link>
                }
              />
              <div className="rounded-card border border-line bg-surface px-[18px] shadow-[var(--cardshadow)]">
                {upcoming.map(({ event, date }) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => router.push(p("/meetings"))}
                    className="flex w-full items-center gap-4 border-t border-line py-3 text-left first:border-t-0"
                  >
                    <div className="w-12 flex-none text-center">
                      <div className="font-mono text-[10px] font-bold uppercase text-accent">
                        {MONTHS_SHORT[date.getMonth()]}
                      </div>
                      <div className="font-display text-[23px] font-semibold leading-none text-ink option-b:font-normal">
                        {date.getDate()}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-[15.5px] font-semibold text-ink option-b:font-normal option-d:font-bold">
                        {event.title}
                      </h3>
                      <p className="mt-px font-body text-[12.5px] text-faint">
                        {event.note}
                      </p>
                    </div>
                    <span className="whitespace-nowrap font-body text-[12.5px] text-ink-soft">
                      {event.time}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Center — The Circle (chat). Moves to the top when the grid collapses. */}
          <CircleChat
            initialPage={messagePage}
            loadOlder={loadOlderMessages}
            user={user}
            lookup={lookup}
            className="order-first min-[720px]:col-span-2 min-[1080px]:order-none min-[1080px]:col-span-1"
          />

          {/* Right — recently shared */}
          <section>
            <SectionHeader
              title="Just shared"
              more={
                <Link
                  href={p("/library")}
                  className="font-body text-[13px] font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  The Library →
                </Link>
              }
            />
            <div>
              {recent.map((r) => (
                <ResourceCard
                  key={r.id}
                  r={r}
                  author={lookup(r.authorId)}
                  onOpen={setOpenId}
                />
              ))}
            </div>
          </section>
        </div>
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

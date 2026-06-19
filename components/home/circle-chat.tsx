"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Avatar } from "@/components/avatar";
import type { AuthorInfo } from "@/components/library/kinds";
import type { SessionUser } from "@/components/session";
import type { Message, MessagePage } from "@/lib/data";

/** Fixed height of the chat card, so new messages scroll rather than grow it. */
const CHAT_HEIGHT = "h-[750px]";

function nowLabel(): string {
  return new Date()
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .toUpperCase();
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[10px] uppercase text-faint">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function Bubble({ message, author }: { message: Message; author: AuthorInfo }) {
  const me = message.authorId === "you";
  return (
    <div className={`flex items-start gap-[11px] ${me ? "flex-row-reverse" : ""}`}>
      <Avatar person={author} size={34} />
      <div
        className={`flex max-w-[76%] flex-col gap-1 ${me ? "items-end" : ""}`}
      >
        <span
          className={`flex items-baseline gap-2 font-body text-[13px] font-semibold text-ink ${
            me ? "flex-row-reverse" : ""
          }`}
        >
          {author.name}
          <span className="text-[11.5px] font-normal text-faint">
            {message.when}
          </span>
        </span>
        <span
          className={`rounded-card border px-[13px] py-[9px] font-body text-[14.5px] leading-[1.5] ${
            me
              ? "border-accent bg-accent text-accent-ink"
              : "border-line bg-bg text-ink"
          }`}
        >
          {message.body}
        </span>
      </div>
    </div>
  );
}

/**
 * "The Circle" — the group-text feed shown in the center of the member Home.
 *
 * The card is a fixed height with the message list as the only scroll region.
 * It opens on the newest page (pinned to the bottom) and fetches older pages
 * via `loadOlder` as the member scrolls toward the top, prepending each batch
 * while holding the viewport on the same message.
 */
export function CircleChat({
  initialPage,
  loadOlder,
  user,
  lookup,
  className,
}: {
  initialPage: MessagePage;
  loadOlder: (cursor: string) => Promise<MessagePage>;
  user: SessionUser;
  lookup: (id: string) => AuthorInfo;
  className?: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialPage.messages);
  const [cursor, setCursor] = useState<string | null>(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement>(null);
  // Coordinates the post-render scroll adjustment with what just changed.
  const didInit = useRef(false);
  const prependFromHeight = useRef<number | null>(null);
  const stickBottom = useRef(false);

  // Keep the viewport steady: pin to the bottom on first paint and after we
  // send; after prepending older messages, offset scrollTop by the growth so
  // the message the member was reading stays put.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!didInit.current) {
      el.scrollTop = el.scrollHeight;
      didInit.current = true;
      return;
    }
    if (prependFromHeight.current !== null) {
      el.scrollTop += el.scrollHeight - prependFromHeight.current;
      prependFromHeight.current = null;
      return;
    }
    if (stickBottom.current) {
      el.scrollTop = el.scrollHeight;
      stickBottom.current = false;
    }
  }, [messages]);

  const fetchOlder = useCallback(async () => {
    if (!hasMore || loadingOlder || cursor === null) return;
    setLoadingOlder(true);
    prependFromHeight.current = scrollRef.current?.scrollHeight ?? 0;
    try {
      const page = await loadOlder(cursor);
      setMessages((prev) => {
        const have = new Set(prev.map((m) => m.id));
        const fresh = page.messages.filter((m) => !have.has(m.id));
        return [...fresh, ...prev];
      });
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMore, loadingOlder, cursor, loadOlder]);

  // Load the previous page when the top of the history scrolls into view.
  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = topSentinel.current;
    if (!root || !sentinel) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void fetchOlder();
      },
      { root, rootMargin: "120px 0px 0px 0px" },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [fetchOlder]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    stickBottom.current = true;
    setMessages((prev) => [
      ...prev,
      {
        id: "msg" + Date.now(),
        authorId: "you",
        day: "Today",
        when: nowLabel(),
        body,
      },
    ]);
    setDraft("");
  }

  return (
    <div
      className={`flex flex-col self-stretch overflow-hidden rounded-card border border-line bg-surface shadow-[var(--cardshadow)] ${CHAT_HEIGHT} ${className ?? ""}`}
    >
      <div className="border-b border-line bg-accent px-5 py-4" />

      <div ref={scrollRef} className="flex flex-1 flex-col gap-[15px] overflow-y-auto p-5">
        <div ref={topSentinel} />
        {hasMore ? (
          <div className="text-center font-mono text-[10px] uppercase text-faint">
            {loadingOlder ? "Loading earlier messages…" : "Scroll up for more"}
          </div>
        ) : (
          <div className="text-center font-mono text-[10px] uppercase text-faint">
            The beginning of the circle
          </div>
        )}
        {messages.map((m, i) => (
          <div key={m.id} className="flex flex-col gap-[15px]">
            {i === 0 || messages[i - 1].day !== m.day ? (
              <DayDivider label={m.day} />
            ) : null}
            <Bubble message={m} author={lookup(m.authorId)} />
          </div>
        ))}
      </div>

      <form
        onSubmit={send}
        className="flex items-center gap-2.5 border-t border-line px-4 py-3.5"
      >
        <Avatar person={user} size={30} />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the circle…"
          aria-label="Message the circle"
          className="flex-1 rounded-chip border border-line-strong bg-bg px-4 py-2.5 font-body text-[14.5px] text-ink outline-none transition-colors placeholder:text-faint focus:border-accent"
        />
      </form>
    </div>
  );
}

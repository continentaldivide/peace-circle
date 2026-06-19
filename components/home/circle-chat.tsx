"use client";

import { useState } from "react";

import { Avatar } from "@/components/avatar";
import type { AuthorInfo } from "@/components/library/kinds";
import type { SessionUser } from "@/components/session";
import type { Message } from "@/lib/data";

const TTL =
  "font-display text-[17px] font-semibold text-ink option-b:font-normal";

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

/** "The Circle" — the group-text feed shown in the center of the member Home. */
export function CircleChat({
  initialMessages,
  user,
  lookup,
  className,
}: {
  initialMessages: Message[];
  user: SessionUser;
  lookup: (id: string) => AuthorInfo;
  className?: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
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
      className={`flex flex-col self-stretch rounded-card border border-line bg-surface shadow-[var(--cardshadow)] ${className ?? ""}`}
    >
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <Avatar person={{ initials: "PC", tint: "var(--accent)" }} size={30} />
        <span className={TTL}>The Circle</span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase text-faint">
          <span className="h-[7px] w-[7px] rounded-full bg-accent" />
          live
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-[15px] p-5">
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

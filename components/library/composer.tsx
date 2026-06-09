"use client";

import { useState } from "react";

import { KIND_LABELS } from "@/components/library/kinds";
import { RingMark } from "@/components/ring-mark";
import type { SessionUser } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Sheet, SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Comment, Resource, ResourceKind } from "@/lib/data";

const COMPOSE_KINDS: ResourceKind[] = [
  "quote",
  "link",
  "picture",
  "book",
  "event",
];

type Fields = Record<string, string>;

export function Composer({
  open,
  user,
  onClose,
  onCreate,
}: {
  open: boolean;
  user: SessionUser;
  onClose: () => void;
  onCreate: (r: Resource) => void;
}) {
  const [kind, setKind] = useState<ResourceKind>("quote");
  const [f, setF] = useState<Fields>({});

  const set =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF((prev) => ({ ...prev, [key]: e.target.value }));

  const t = (key: string) => (f[key] || "").trim();

  const canPost = (() => {
    switch (kind) {
      case "quote":
        return t("quote").length > 3;
      case "link":
        return !!t("title") && !!t("url");
      case "picture":
      case "book":
        return !!t("title");
      case "event":
        return !!t("title") && !!t("eventDate");
    }
  })();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canPost) return;
    const base = {
      id: "r" + Date.now(),
      authorId: "you",
      when: "just now",
      comments: [] as Comment[],
    };

    let r: Resource;
    switch (kind) {
      case "quote":
        r = {
          ...base,
          kind,
          quote: t("quote"),
          attribution: t("attribution") || `— shared by ${user.name}`,
          note: t("note") || undefined,
        };
        break;
      case "link":
        r = {
          ...base,
          kind,
          title: t("title"),
          url: t("url"),
          body: t("note"),
        };
        break;
      case "picture":
        r = {
          ...base,
          kind,
          title: t("title"),
          caption: t("note") || undefined,
          placeholder: "photo — " + t("title").toLowerCase(),
        };
        break;
      case "book":
        r = {
          ...base,
          kind,
          title: t("title"),
          bookAuthor: t("bookAuthor") || "Unknown",
          body: t("note"),
        };
        break;
      case "event":
        r = {
          ...base,
          kind,
          title: t("title"),
          eventDate: t("eventDate"),
          location: t("location") || undefined,
          body: t("note"),
        };
        break;
    }

    onCreate(r);
    setF({});
    setKind("quote");
  }

  return (
    <Sheet open={open} onClose={onClose} label="Share something">
      <SheetClose onClose={onClose} />
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-7 sm:px-8">
        <h2 className="font-display text-[22px] font-semibold text-ink option-b:font-normal option-d:font-bold">
          Share with the circle
        </h2>
        <p className="mt-1 font-body text-[14.5px] text-ink-soft">
          Pass along something that helped you stay steady.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {COMPOSE_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "rounded-chip border px-3.5 py-1.5 font-body text-[13px] font-medium transition-colors",
                kind === k
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line-strong bg-surface text-ink-soft hover:text-ink",
              )}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          {kind === "quote" ? (
            <>
              <Field label="The quote">
                <textarea
                  rows={3}
                  value={f.quote || ""}
                  onChange={set("quote")}
                  placeholder="A line worth keeping…"
                  className={`${inputClass} resize-none`}
                />
              </Field>
              <Field label="Who said it" hint="(optional)">
                <input
                  value={f.attribution || ""}
                  onChange={set("attribution")}
                  placeholder="— name or source"
                  className={inputClass}
                />
              </Field>
              <Field label="Why it stayed with you" hint="(optional)">
                <input
                  value={f.note || ""}
                  onChange={set("note")}
                  placeholder="A short note"
                  className={inputClass}
                />
              </Field>
            </>
          ) : null}

          {kind === "link" ? (
            <>
              <Field label="Title">
                <input
                  value={f.title || ""}
                  onChange={set("title")}
                  placeholder="What is it?"
                  className={inputClass}
                />
              </Field>
              <Field label="Web address">
                <input
                  value={f.url || ""}
                  onChange={set("url")}
                  placeholder="example.com/article"
                  className={inputClass}
                />
              </Field>
              <Field label="A note" hint="(optional)">
                <input
                  value={f.note || ""}
                  onChange={set("note")}
                  placeholder="Why you're sharing it"
                  className={inputClass}
                />
              </Field>
            </>
          ) : null}

          {kind === "picture" ? (
            <>
              <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line-strong bg-bg px-4 py-7 text-center">
                <span className="text-accent">
                  <RingMark size={30} rings={3} />
                </span>
                <p className="font-body text-[14px] text-ink-soft">
                  Drag a photo here, or tap to choose
                </p>
                <span className="font-body text-[12px] text-faint">
                  (placeholder — real upload comes later)
                </span>
              </div>
              <Field label="Title">
                <input
                  value={f.title || ""}
                  onChange={set("title")}
                  placeholder="e.g. Candles after the circle"
                  className={inputClass}
                />
              </Field>
              <Field label="Caption" hint="(optional)">
                <input
                  value={f.note || ""}
                  onChange={set("note")}
                  placeholder="A few words about it"
                  className={inputClass}
                />
              </Field>
            </>
          ) : null}

          {kind === "book" ? (
            <>
              <Field label="Title">
                <input
                  value={f.title || ""}
                  onChange={set("title")}
                  placeholder="Book title"
                  className={inputClass}
                />
              </Field>
              <Field label="Author">
                <input
                  value={f.bookAuthor || ""}
                  onChange={set("bookAuthor")}
                  placeholder="Who wrote it"
                  className={inputClass}
                />
              </Field>
              <Field label="Why you recommend it" hint="(optional)">
                <input
                  value={f.note || ""}
                  onChange={set("note")}
                  placeholder="A short note"
                  className={inputClass}
                />
              </Field>
            </>
          ) : null}

          {kind === "event" ? (
            <>
              <Field label="What's happening">
                <input
                  value={f.title || ""}
                  onChange={set("title")}
                  placeholder="e.g. June Circle — an hour of stillness"
                  className={inputClass}
                />
              </Field>
              <Field label="When">
                <input
                  value={f.eventDate || ""}
                  onChange={set("eventDate")}
                  placeholder="Sunday, June 21 · 4:00 PM"
                  className={inputClass}
                />
              </Field>
              <Field label="Where" hint="(optional)">
                <input
                  value={f.location || ""}
                  onChange={set("location")}
                  placeholder="Grace United Church"
                  className={inputClass}
                />
              </Field>
              <Field label="Details" hint="(optional)">
                <textarea
                  rows={2}
                  value={f.note || ""}
                  onChange={set("note")}
                  placeholder="Anything else to know"
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </>
          ) : null}

          <Button type="submit" block disabled={!canPost}>
            Share with the circle
          </Button>
        </form>
      </div>
    </Sheet>
  );
}

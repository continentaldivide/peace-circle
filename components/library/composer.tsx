"use client";

import { useState, useTransition } from "react";

import { createResource } from "@/app/actions/resources";
import { KIND_LABELS } from "@/components/library/kinds";
import { RingMark } from "@/components/ring-mark";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Sheet, SheetClose } from "@/components/ui/sheet";
import type { ResourceKind } from "@/lib/data";
import type { ResourceDraft, ResourceField } from "@/lib/resources";
import {
  emptyResourceDraft,
  isComplete,
  RESOURCE_FIELDS,
  validateResource,
} from "@/lib/resources";
import { cn } from "@/lib/utils";

const COMPOSE_KINDS: ResourceKind[] = ["quote", "link", "picture", "book"];

/** Every field revealed at once, for the moment someone presses Share. */
const ALL_TOUCHED = Object.fromEntries(
  RESOURCE_FIELDS.map((field) => [field, true]),
) as Record<ResourceField, boolean>;

/**
 * "Share with the circle" — the composer sheet, on Home and in the Library.
 *
 * The post goes to the database through `createResource`, which answers with
 * the new share's id and re-renders the page around it. Both happen inside one
 * transition, so the sheet closes onto a Library that already has the row in
 * it rather than onto a frame of empty detail.
 *
 * `validateResource` is the same function the action runs, so the two cannot
 * disagree about what may be posted.
 */
export function Composer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  /** The new share's id, once the database has it. */
  onCreated: (id: string) => void;
}) {
  const [draft, setDraft] = useState<ResourceDraft>(emptyResourceDraft);
  const [touched, setTouched] = useState<
    Partial<Record<ResourceField, boolean>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const errors = validateResource(draft);

  // A field's error stays hidden until they have left it once, so the sheet
  // does not scold someone for a half-typed address as they go.
  const shownError = (field: ResourceField) =>
    touched[field] ? errors[field] : undefined;

  const set =
    (field: ResourceField) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((prev) => ({ ...prev, [field]: e.target.value }));

  const blur = (field: ResourceField) => () =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const fieldClass = (field: ResourceField) =>
    cn(
      inputClass,
      shownError(field) &&
        "border-warn ring-2 ring-warn-soft focus:border-warn",
    );

  function pickKind(kind: ResourceKind) {
    setDraft((prev) => ({ ...prev, kind }));
    // The next kind asks different questions; a complaint about the last
    // one's should not still be on screen.
    setTouched({});
    setFormError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    if (Object.keys(errors).length > 0) {
      // Nothing is sent, so there is no round trip to lose — show every
      // outstanding problem at once instead.
      setTouched(ALL_TOUCHED);
      return;
    }

    startTransition(async () => {
      // Caught rather than allowed to escape: an error thrown out of an async
      // transition goes to the nearest error boundary, and a dispatch that
      // never reached the action — offline, or a 500 — would take the page
      // down and the half-written share with it.
      let result;
      try {
        result = await createResource(draft);
      } catch (error) {
        console.warn("[resources] could not post a share", error);
        setFormError("That didn't save. Please try again.");
        return;
      }

      if (result.status === "error") {
        setFormError(result.formError);
        return;
      }

      // Inside the transition, so this lands together with the re-rendered
      // page the action sent back with it.
      onCreated(result.id);
      setDraft(emptyResourceDraft);
      setTouched({});
      setFormError(null);
    });
  }

  return (
    <Sheet open={open} onClose={onClose} label="Share something">
      <SheetClose onClose={onClose} />
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-7 sm:px-8">
        <h2 className="font-display text-[22px] font-semibold text-ink">
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
              onClick={() => pickKind(k)}
              className={cn(
                "cursor-pointer rounded-chip border px-3.5 py-1.5 font-body text-[13px] font-medium transition-colors",
                draft.kind === k
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line-strong bg-surface text-ink-soft hover:text-ink",
              )}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
          {/* The fields swap per kind and each kind is a different height, so
              the sheet used to grow and shrink under the chips — making them
              jump away mid-click. Reserving the tallest variant's height keeps
              the chips still. The tallest is "picture": a ~143px drop zone plus
              two fields. Re-measure if a kind gains or loses a field. */}
          <div className="flex min-h-[320px] flex-col gap-4">
            {draft.kind === "quote" ? (
              <>
                <Field label="The quote" error={shownError("quote")}>
                  <textarea
                    rows={3}
                    value={draft.quote}
                    onChange={set("quote")}
                    onBlur={blur("quote")}
                    aria-invalid={!!shownError("quote")}
                    placeholder="A line worth keeping…"
                    className={cn(fieldClass("quote"), "resize-none")}
                  />
                </Field>
                <Field label="Who said it" hint="(optional)">
                  <input
                    value={draft.attribution}
                    onChange={set("attribution")}
                    placeholder="— name or source"
                    className={inputClass}
                  />
                </Field>
                <Field label="Why it stayed with you" hint="(optional)">
                  <input
                    value={draft.note}
                    onChange={set("note")}
                    placeholder="A short note"
                    className={inputClass}
                  />
                </Field>
              </>
            ) : null}

            {draft.kind === "link" ? (
              <>
                <Field label="Title" error={shownError("title")}>
                  <input
                    value={draft.title}
                    onChange={set("title")}
                    onBlur={blur("title")}
                    aria-invalid={!!shownError("title")}
                    placeholder="What is it?"
                    className={fieldClass("title")}
                  />
                </Field>
                <Field label="Web address" error={shownError("url")}>
                  <input
                    value={draft.url}
                    onChange={set("url")}
                    onBlur={blur("url")}
                    aria-invalid={!!shownError("url")}
                    placeholder="example.com/article"
                    className={fieldClass("url")}
                  />
                </Field>
                <Field label="A note" hint="(optional)">
                  <input
                    value={draft.note}
                    onChange={set("note")}
                    placeholder="Why you're sharing it"
                    className={inputClass}
                  />
                </Field>
              </>
            ) : null}

            {draft.kind === "picture" ? (
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
                <Field label="Title" error={shownError("title")}>
                  <input
                    value={draft.title}
                    onChange={set("title")}
                    onBlur={blur("title")}
                    aria-invalid={!!shownError("title")}
                    placeholder="e.g. Candles after the circle"
                    className={fieldClass("title")}
                  />
                </Field>
                <Field label="Caption" hint="(optional)">
                  <input
                    value={draft.note}
                    onChange={set("note")}
                    placeholder="A few words about it"
                    className={inputClass}
                  />
                </Field>
              </>
            ) : null}

            {draft.kind === "book" ? (
              <>
                <Field label="Title" error={shownError("title")}>
                  <input
                    value={draft.title}
                    onChange={set("title")}
                    onBlur={blur("title")}
                    aria-invalid={!!shownError("title")}
                    placeholder="Book title"
                    className={fieldClass("title")}
                  />
                </Field>
                <Field label="Author">
                  <input
                    value={draft.bookAuthor}
                    onChange={set("bookAuthor")}
                    placeholder="Who wrote it"
                    className={inputClass}
                  />
                </Field>
                <Field label="Why you recommend it" hint="(optional)">
                  <input
                    value={draft.note}
                    onChange={set("note")}
                    placeholder="A short note"
                    className={inputClass}
                  />
                </Field>
              </>
            ) : null}
          </div>

          {/* Only reachable if the server refuses something the sheet allowed:
              a bypassed client, or the insert itself failing. */}
          {formError ? (
            <p
              role="alert"
              className="rounded-[10px] border border-warn bg-warn-soft px-4 py-3 font-body text-[14px] leading-relaxed text-warn"
            >
              {formError}
            </p>
          ) : null}

          <Button type="submit" block disabled={!isComplete(draft) || pending}>
            {pending ? "Sharing…" : "Share with the circle"}
          </Button>
        </form>
      </div>
    </Sheet>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { createResource } from "@/app/actions/resources";
import { KIND_LABELS } from "@/components/library/kinds";
import { RingMark } from "@/components/ring-mark";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Sheet, SheetClose } from "@/components/ui/sheet";
import type { Member, ResourceKind } from "@/lib/data";
import type { PreparedImage } from "@/lib/image-file";
import {
  describeFileProblem,
  discardImage,
  prepareImage,
  uploadImage,
} from "@/lib/image-file";
import type { DraftImage, ResourceDraft, ResourceField } from "@/lib/resources";
import {
  emptyResourceDraft,
  isComplete,
  RESOURCE_FIELDS,
  validateResource,
} from "@/lib/resources";
import { cn } from "@/lib/utils";

const COMPOSE_KINDS: ResourceKind[] = ["quote", "link", "picture", "book"];

/** A prepared picture plus the object URL the preview is drawn from. The URL
 *  is the scaled JPEG, so what is on screen is what the circle will see. */
type Picked = PreparedImage & { previewUrl: string };

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
 *
 * A picture takes one more step, in a deliberate order. Choosing a file scales
 * and re-encodes it right away, while the member is still typing a title: the
 * slow part is done by the time they press the button, the preview is exactly
 * the image that will be shared, and a file the browser cannot read is refused
 * at the moment it is picked rather than at the end. Nothing is *uploaded*
 * until they post, so changing their mind and closing the sheet leaves nothing
 * behind — and if the row then fails to save, the object that was just uploaded
 * is removed again, because nothing else would ever refer to it.
 */
export function Composer({
  user,
  open,
  onClose,
  onCreated,
}: {
  /** Whose folder an uploaded picture goes in; the storage policies check the
   *  session against the same id. */
  user: Member;
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

  const [picture, setPicture] = useState<Picked | null>(null);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // An object URL holds its blob until it is revoked. The sheet outlives any
  // one choice of photo, so the last one is released when this unmounts.
  useEffect(() => {
    return () => {
      if (picture) URL.revokeObjectURL(picture.previewUrl);
    };
  }, [picture]);

  function clearPicture() {
    setPicture((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setPictureError(null);
    // Without this, choosing the same file again fires no change event.
    if (fileInput.current) fileInput.current.value = "";
  }

  async function choose(file: File | undefined) {
    if (!file) return;
    clearPicture();

    const problem = describeFileProblem(file);
    if (problem) {
      setPictureError(problem);
      return;
    }

    setPreparing(true);
    try {
      const prepared = await prepareImage(file);
      setPicture({
        ...prepared,
        previewUrl: URL.createObjectURL(prepared.blob),
      });
    } catch (error) {
      // Almost always a format this browser cannot decode — a HEIC from an
      // iPhone opened on a desktop is the one that actually happens.
      console.warn("[images] could not prepare a picture", error);
      setPictureError(
        "That photo couldn't be read. Try a JPEG, PNG or WebP instead.",
      );
    } finally {
      setPreparing(false);
    }
  }

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
    // The photo is kept, the way every other field is: the sheet remembers
    // what you typed when you change your mind about the chips, and nothing
    // has been uploaded yet. `toResourceInsert` reads it only for a picture,
    // so a quote posted after a detour through Picture carries no image.
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    // Whatever the server said last time was about the last attempt. Cleared
    // here rather than only on success, so it does not sit above a field
    // complaint, or above "Sharing…" while this attempt is still in flight.
    setFormError(null);

    if (Object.keys(errors).length > 0) {
      // Nothing is sent, so there is no round trip to lose — show every
      // outstanding problem at once instead.
      setTouched(ALL_TOUCHED);
      return;
    }

    startTransition(async () => {
      // The upload comes first, and is its own failure. An action cannot carry
      // the bytes — a Server Action's body is capped at 1 MB — so this is a
      // separate request to Storage, made with the member's own session, and
      // it can fail on its own terms.
      let image: DraftImage | undefined;
      if (draft.kind === "picture" && picture) {
        setUploading(true);
        try {
          image = await uploadImage(user.id, picture);
        } catch (error) {
          console.warn("[images] could not upload a picture", error);
          setFormError(
            "That photo didn't upload. Please check your connection and try again.",
          );
          return;
        } finally {
          setUploading(false);
        }
      }

      // Caught rather than allowed to escape: an error thrown out of an async
      // transition goes to the nearest error boundary, and a dispatch that
      // never reached the action — offline, or a 500 — would take the page
      // down and the half-written share with it.
      let result;
      try {
        result = await createResource(image ? { ...draft, image } : draft);
      } catch (error) {
        console.warn("[resources] could not post a share", error);
        // The file is already in Storage and this row is not going to point at
        // it. Left alone it would sit there forever with nothing referring to
        // it, and every retry would add another.
        if (image) await discardImage(image);
        setFormError("That didn't save. Please try again.");
        return;
      }

      if (result.status === "error") {
        if (image) await discardImage(image);
        setFormError(result.formError);
        return;
      }

      // Inside the transition, so this lands together with the re-rendered
      // page the action sent back with it.
      onCreated(result.id);
      setDraft(emptyResourceDraft);
      setTouched({});
      clearPicture();
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
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void choose(e.dataTransfer.files[0]);
                  }}
                  className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line-strong bg-bg px-4 py-5 text-center"
                >
                  {picture ? (
                    <>
                      {/* A blob from the member's own disk, at a size this
                          component computed. next/image would add nothing —
                          there is nothing to optimize and no layout to
                          reserve that is not already known. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={picture.previewUrl}
                        alt=""
                        width={picture.width}
                        height={picture.height}
                        className="max-h-[120px] w-auto rounded-[8px]"
                      />
                      <p className="font-body text-[12px] text-faint">
                        {picture.width}×{picture.height}, scaled for sharing
                      </p>
                      <button
                        type="button"
                        onClick={clearPicture}
                        className="cursor-pointer font-body text-[13px] font-medium text-accent"
                      >
                        Choose a different photo
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-accent">
                        <RingMark size={30} rings={3} />
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        disabled={preparing}
                        className="cursor-pointer font-body text-[14px] text-ink-soft hover:text-ink"
                      >
                        {preparing
                          ? "Getting it ready…"
                          : "Drag a photo here, or tap to choose"}
                      </button>
                      <span className="font-body text-[12px] text-faint">
                        A photo, up to 25 MB. Optional.
                      </span>
                    </>
                  )}
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => void choose(e.target.files?.[0])}
                  />
                </div>
                {pictureError ? (
                  <p
                    role="alert"
                    className="-mt-2 font-body text-[13px] text-warn"
                  >
                    {pictureError}
                  </p>
                ) : null}
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

          <Button
            type="submit"
            block
            disabled={!isComplete(draft) || pending || preparing}
          >
            {uploading
              ? "Uploading the photo…"
              : pending
                ? "Sharing…"
                : "Share with the circle"}
          </Button>
        </form>
      </div>
    </Sheet>
  );
}

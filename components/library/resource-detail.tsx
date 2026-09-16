"use client";

import { useOptimistic, useState, useTransition } from "react";

import { addComment } from "@/app/actions/resources";
import { Avatar } from "@/components/avatar";
import type { AuthorInfo } from "@/components/library/kinds";
import {
  CardMeta,
  KindTag,
  ResourceBody,
} from "@/components/library/resource-body";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Sheet, SheetClose } from "@/components/ui/sheet";
import type { Comment, Member, Resource } from "@/lib/data";
import { formatRelative } from "@/lib/time";
import { trimmedBody } from "@/lib/validation";

/**
 * A share, its thread, and the box for adding to it.
 *
 * A new comment is drawn before it is saved and taken from `pending` again
 * once it is: `addComment` re-renders the page in the same response, so the
 * saved row is in `resource.comments` by the time the transition ends and
 * `useOptimistic` empties. That handover is why the two lists can be
 * concatenated without a comment ever appearing twice.
 */
export function ResourceDetail({
  open,
  resource,
  user,
  now,
  lookup,
  onClose,
}: {
  open: boolean;
  resource: Resource | null;
  user: Member;
  now: string;
  lookup: (authorId: string) => AuthorInfo;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [pending, addPending] = useOptimistic<Comment[]>([]);
  const [, startTransition] = useTransition();
  const [postError, setPostError] = useState<string | null>(null);

  // Keep showing the last resource while the sheet animates closed: `resource`
  // goes null the instant `openId` clears, but the panel is still on screen for
  // the exit transition. Retaining the last value avoids a blank card. Synced
  // during render (not an effect) so it never lags a frame behind on open.
  const [shown, setShown] = useState(resource);
  if (resource && resource !== shown) setShown(resource);

  function post(e: React.FormEvent) {
    e.preventDefault();
    const body = trimmedBody(draft);
    if (!body || !shown) return;

    const resourceId = shown.id;
    // Cleared outside the transition so the box empties on this frame; a
    // useState setter called inside one waits for the action to finish.
    setDraft("");
    setPostError(null);

    startTransition(async () => {
      addPending((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          authorId: user.id,
          // The browser's clock, for the moment before the saved row arrives
          // with the database's own. Anything at or after the page's `now`
          // reads "just now", which is what this is.
          createdAt: new Date().toISOString(),
          body,
        },
      ]);

      // Caught rather than allowed to escape: an error thrown out of an async
      // transition goes to the nearest error boundary, and a dispatch that
      // never reached the action — offline, or a 500 — would take the whole
      // page down over one comment. Designed boundaries are Step 7; losing
      // the sheet is not the failure this deserves either way.
      try {
        const result = await addComment(resourceId, body);
        if (result.status === "error") failed(body, result.formError);
      } catch (error) {
        console.warn("[comments] could not post a comment", error);
        failed(body, "That comment didn't save. Please try again.");
      }
    });
  }

  /**
   * The optimistic comment disappears when the transition ends, so hand the
   * words back rather than letting them go with it. Only if the box is still
   * empty: they may have started typing something else meanwhile.
   */
  function failed(body: string, why: string) {
    setDraft((current) => (current === "" ? body : current));
    setPostError(why);
  }

  const comments = shown ? [...shown.comments, ...pending] : [];
  const count = comments.length;

  return (
    <Sheet open={open} onClose={onClose} label="Resource detail">
      <SheetClose onClose={onClose} />
      {shown ? (
        <>
          <div className="flex-1 overflow-y-auto px-6 pb-5 pt-7 sm:px-8">
            <div className="pb-5">
              <KindTag kind={shown.kind} />
              <ResourceBody r={shown} />
              <div className="mt-3 border-t border-line pt-[11px]">
                <CardMeta
                  author={lookup(shown.authorId)}
                  createdAt={shown.createdAt}
                  now={now}
                />
              </div>
            </div>

            <div className="border-t border-line pt-5">
              <h4 className="font-display text-[16px] font-semibold text-ink">
                {count === 0
                  ? "No comments yet"
                  : `${count} comment${count === 1 ? "" : "s"}`}
              </h4>
              <div className="mt-3 flex flex-col gap-4">
                {count === 0 ? (
                  <p className="font-body text-[14px] text-faint">
                    Be the first to respond. A short note is plenty.
                  </p>
                ) : null}
                {comments.map((c) => {
                  const a = lookup(c.authorId);
                  return (
                    <div
                      key={c.id}
                      className={`flex gap-3 ${
                        pending.includes(c) ? "opacity-60" : ""
                      }`}
                    >
                      <Avatar person={a} size={30} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2">
                          <span className="font-body text-[13.5px] font-semibold text-ink">
                            {a.name}
                          </span>
                          <span className="font-body text-[12px] text-faint">
                            {formatRelative(c.createdAt, now)}
                          </span>
                        </p>
                        <p className="mt-0.5 font-body text-[14px] leading-[1.5] text-ink-soft">
                          {c.body}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-none border-t border-line">
            {postError ? (
              <p
                role="alert"
                className="px-6 pt-2.5 font-body text-[12.5px] text-warn sm:px-8"
              >
                {postError}
              </p>
            ) : null}
            <form
              onSubmit={post}
              className="flex items-center gap-2.5 px-6 py-3.5 sm:px-8"
            >
              <Avatar person={user} size={32} />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a comment…"
                className={inputClass}
              />
              <Button type="submit" size="sm" disabled={!trimmedBody(draft)}>
                Post
              </Button>
            </form>
          </div>
        </>
      ) : null}
    </Sheet>
  );
}

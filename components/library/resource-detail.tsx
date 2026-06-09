"use client";

import { useState } from "react";

import { Avatar } from "@/components/avatar";
import type { AuthorInfo } from "@/components/library/kinds";
import {
  CardMeta,
  KindTag,
  ResourceBody,
} from "@/components/library/resource-body";
import type { SessionUser } from "@/components/session";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Sheet, SheetClose } from "@/components/ui/sheet";
import type { Resource } from "@/lib/data";

export function ResourceDetail({
  open,
  resource,
  user,
  lookup,
  onClose,
  onAddComment,
}: {
  open: boolean;
  resource: Resource | null;
  user: SessionUser;
  lookup: (authorId: string) => AuthorInfo;
  onClose: () => void;
  onAddComment: (resourceId: string, body: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function post(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !resource) return;
    onAddComment(resource.id, body);
    setDraft("");
  }

  const count = resource?.comments.length ?? 0;

  return (
    <Sheet open={open} onClose={onClose} label="Resource detail">
      <SheetClose onClose={onClose} />
      {resource ? (
        <>
          <div className="flex-1 overflow-y-auto px-6 pb-5 pt-7 sm:px-8">
            <div className="pb-5">
              <KindTag kind={resource.kind} />
              <ResourceBody r={resource} />
              <div className="mt-3 border-t border-line pt-[11px]">
                <CardMeta
                  author={lookup(resource.authorId)}
                  when={resource.when}
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
                {resource.comments.map((c) => {
                  const a = lookup(c.authorId);
                  return (
                    <div key={c.id} className="flex gap-3">
                      <Avatar person={a} size={30} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2">
                          <span className="font-body text-[13.5px] font-semibold text-ink">
                            {a.name}
                          </span>
                          <span className="font-body text-[12px] text-faint">
                            {c.when}
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

          <form
            onSubmit={post}
            className="flex flex-none items-center gap-2.5 border-t border-line px-6 py-3.5 sm:px-8"
          >
            <Avatar person={user} size={32} />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              className={inputClass}
            />
            <Button type="submit" size="sm" disabled={!draft.trim()}>
              Post
            </Button>
          </form>
        </>
      ) : null}
    </Sheet>
  );
}

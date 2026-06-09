"use client";

import type { AuthorInfo } from "@/components/library/kinds";
import {
  CardMeta,
  KindTag,
  ResourceBody,
} from "@/components/library/resource-body";
import type { Resource } from "@/lib/data";

function CommentPip({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-body text-[12.5px] text-faint">
      <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
        <path
          d="M2 3.5A1.5 1.5 0 0 1 3.5 2h8A1.5 1.5 0 0 1 13 3.5v5A1.5 1.5 0 0 1 11.5 10H6l-3 2.5V10H3.5A1.5 1.5 0 0 1 2 8.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      </svg>
      {n > 0 ? n : "Comment"}
    </span>
  );
}

export function ResourceCard({
  r,
  author,
  onOpen,
}: {
  r: Resource;
  author: AuthorInfo;
  onOpen: (id: string) => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(r.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(r.id);
        }
      }}
      className="mb-4 block w-full cursor-pointer break-inside-avoid rounded-card border border-line bg-surface px-5 py-[18px] text-left shadow-[var(--cardshadow)] transition-colors hover:border-line-strong focus:outline-none focus-visible:border-accent"
    >
      <KindTag kind={r.kind} />
      <ResourceBody r={r} />
      <div className="mt-3 flex items-center justify-between border-t border-line pt-[11px]">
        <CardMeta author={author} when={r.when} />
        <CommentPip n={r.comments.length} />
      </div>
    </article>
  );
}

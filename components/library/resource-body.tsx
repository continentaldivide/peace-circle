import { Avatar } from "@/components/avatar";
import { KIND_LABELS, type AuthorInfo } from "@/components/library/kinds";
import type { Resource, ResourceKind } from "@/lib/data";

const TITLE =
  "font-display text-[19px] font-semibold leading-[1.22] text-ink option-b:font-normal option-d:font-bold option-d:tracking-[-0.01em]";
const TEXT = "font-body text-[14px] leading-[1.5] text-ink-soft";

export function KindTag({ kind }: { kind: ResourceKind }) {
  return (
    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
      {KIND_LABELS[kind]}
    </span>
  );
}

export function ResourceBody({ r }: { r: Resource }) {
  switch (r.kind) {
    case "quote":
      return (
        <blockquote className="my-2.5">
          <p className="font-display text-[20px] leading-[1.3] text-ink">
            “{r.quote}”
          </p>
          <cite className="mt-2 block font-body text-[13px] not-italic text-faint">
            {r.attribution}
          </cite>
          {r.note ? <p className={`mt-2.5 ${TEXT}`}>{r.note}</p> : null}
        </blockquote>
      );
    case "event":
      return (
        <div className="mt-2.5">
          <h3 className={`mb-1.5 ${TITLE}`}>{r.title}</h3>
          <p className="font-body text-[14px] font-semibold text-accent">
            {r.eventDate}
          </p>
          {r.location ? (
            <p className="font-body text-[13.5px] text-ink-soft">
              {r.location}
            </p>
          ) : null}
          {r.body ? <p className={`mt-2 ${TEXT}`}>{r.body}</p> : null}
        </div>
      );
    case "picture":
      return (
        <div className="mt-2.5">
          <div
            role="img"
            aria-label={r.placeholder}
            className="placeholder-stripes mb-2.5 flex h-24 items-end rounded-card"
          >
            <span className="px-3 py-2.5 font-mono text-[11px] text-faint">
              {r.placeholder}
            </span>
          </div>
          <h3 className={`mb-1 ${TITLE}`}>{r.title}</h3>
          {r.caption ? <p className={TEXT}>{r.caption}</p> : null}
        </div>
      );
    case "book":
      return (
        <div className="mt-2.5">
          <h3 className={`mb-1 ${TITLE}`}>{r.title}</h3>
          <p className="font-body text-[14px] text-ink-soft">
            by {r.bookAuthor}
          </p>
          {r.body ? <p className={`mt-2 ${TEXT}`}>{r.body}</p> : null}
        </div>
      );
    case "link":
      return (
        <div className="mt-2.5">
          <h3 className={`mb-1.5 ${TITLE}`}>{r.title}</h3>
          <span className="mb-2.5 inline-block font-mono text-[11.5px] text-accent">
            {r.url} ↗
          </span>
          {r.body ? <p className={TEXT}>{r.body}</p> : null}
        </div>
      );
  }
}

export function CardMeta({
  author,
  when,
}: {
  author: AuthorInfo;
  when: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar person={author} size={26} />
      <span className="font-body text-[13px] font-semibold text-ink">
        {author.name}
      </span>
      <span className="text-faint">·</span>
      <span className="font-body text-[12.5px] text-faint">{when}</span>
    </div>
  );
}

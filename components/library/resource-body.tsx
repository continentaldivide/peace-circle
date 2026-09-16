import Image from "next/image";

import { Avatar } from "@/components/avatar";
import { KIND_LABELS, type AuthorInfo } from "@/components/library/kinds";
import type { Resource, ResourceKind } from "@/lib/data";
import { normalizeUrl } from "@/lib/resources";
import { formatRelative } from "@/lib/time";

const TITLE = "font-display text-[19px] font-semibold leading-[1.22] text-ink";
const TEXT = "font-body text-[14px] leading-[1.5] text-ink-soft";

export function KindTag({ kind }: { kind: ResourceKind }) {
  return (
    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
      {KIND_LABELS[kind]}
    </span>
  );
}

/** What the striped filler reads when a picture share has no photo. Derived
 *  here rather than carried across the data seam: it is a restatement of the
 *  title, which is presentation, not data. */
function placeholderLabel(title: string): string {
  return `photo — ${title.toLowerCase()}`;
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
    case "picture":
      return (
        <div className="mt-2.5">
          {r.image ? (
            // `unoptimized`, because the route that serves this needs a
            // session and Next's optimizer fetches without one — see
            // app/api/images. What is stored is already scaled down, so the
            // component is here for the layout and the lazy loading: the
            // width and height come from the row, so the card reserves the
            // photo's real shape and nothing below it moves when it arrives.
            //
            // `alt=""` deliberately. The title is the next element down, and
            // the image guidance is explicit that alt text should not repeat
            // what a caption beside the image already says.
            <Image
              src={r.image.src}
              alt=""
              width={r.image.width}
              height={r.image.height}
              unoptimized
              className="mb-2.5 h-auto w-full rounded-card bg-bg"
            />
          ) : (
            // Pictures shared before uploads existed, and any composed without
            // choosing a file. The striped filler says what the picture is,
            // the way the composer's drop zone does.
            <div
              role="img"
              aria-label={placeholderLabel(r.title)}
              className="placeholder-stripes mb-2.5 flex h-24 items-end rounded-card"
            >
              <span className="px-3 py-2.5 font-mono text-[11px] text-faint">
                {placeholderLabel(r.title)}
              </span>
            </div>
          )}
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
          <ShareLink url={r.url} />
          {r.body ? <p className={TEXT}>{r.body}</p> : null}
        </div>
      );
  }
}

const LINK_TEXT = "mb-2.5 inline-block font-mono text-[11.5px] text-accent";

/**
 * A link share's address, as a link that works.
 *
 * The `href` is `normalizeUrl`'s reading of the stored value, not the value
 * itself. Addresses saved since Step 5 are already normalised, but the column
 * is plain text and older rows are not: the seeded one is `plumvillage.org`,
 * which as an `href` would resolve against this site. `normalizeUrl` is also
 * what refuses anything but http(s), so a stored `javascript:` stays inert
 * text here instead of becoming a script someone else clicks.
 *
 * A new tab, so the member keeps their place in the Library; `noreferrer`,
 * so the site they visit is not told which page of the circle sent them — the
 * URL can carry a search.
 *
 * It sits inside a card that is itself a button, so it keeps its own clicks
 * and keypresses: without `stopPropagation` a click would also open the
 * share's detail sheet, and the card's Enter handler would `preventDefault`
 * the keypress before the link could follow it.
 */
function ShareLink({ url }: { url: string }) {
  const href = normalizeUrl(url);
  if (!href) return <span className={LINK_TEXT}>{url}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className={`${LINK_TEXT} underline-offset-2 hover:underline`}
    >
      {url} ↗
    </a>
  );
}

export function CardMeta({
  author,
  createdAt,
  now,
}: {
  author: AuthorInfo;
  /** ISO timestamp. */
  createdAt: string;
  /** The page's render instant, so server and browser agree on the label. */
  now: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar person={author} size={26} />
      <span className="font-body text-[13px] font-semibold text-ink">
        {author.name}
      </span>
      <span className="text-faint">·</span>
      <span className="font-body text-[12.5px] text-faint">
        {formatRelative(createdAt, now)}
      </span>
    </div>
  );
}

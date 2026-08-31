import Link from "next/link";

import { RingMark } from "@/components/ring-mark";
import { ButtonLink } from "@/components/ui/button";

const NAV_BORDER = "border-b border-line";

const WORDMARK =
  "inline-flex items-center gap-[11px] font-display text-[20px] font-semibold text-ink";

const NAV_LINKS =
  "text-[15px] font-medium text-ink-soft transition-colors hover:text-ink";

/** Public top nav shown on landing / meetings / about. */
export function SiteNav() {
  return (
    <header
      className={`flex flex-wrap items-center justify-between gap-x-5 gap-y-3 px-6 py-[22px] sm:px-14 ${NAV_BORDER}`}
    >
      <Link href="/" className={WORDMARK}>
        <span className="text-accent">
          <RingMark size={22} rings={3} />
        </span>
        <span>Peace Circle</span>
      </Link>

      <nav className="flex flex-wrap items-center gap-x-[26px] gap-y-2">
        {/* Always points at the Library; requireApproved() sends anyone
            who is not a member to /signin or /pending. */}
        <Link href="/library" className={NAV_LINKS}>
          The Library
        </Link>
        <Link href="/meetings" className={NAV_LINKS}>
          Meetings
        </Link>
        <Link href="/about" className={NAV_LINKS}>
          About
        </Link>
        <Link href="/signin" className={`${NAV_LINKS} text-ink`}>
          Sign in
        </Link>
        <ButtonLink href="/join" size="sm">
          Join the circle
        </ButtonLink>
      </nav>
    </header>
  );
}

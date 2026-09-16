import Link from "next/link";

import { MemberNav } from "@/components/member-nav";
import { RingMark } from "@/components/ring-mark";
import { ButtonLink } from "@/components/ui/button";
import { getViewer } from "@/lib/dal";

const NAV_BORDER = "border-b border-line";

const WORDMARK =
  "inline-flex items-center gap-[11px] font-display text-[20px] font-semibold text-ink";

const NAV_LINKS =
  "text-[15px] font-medium text-ink-soft transition-colors hover:text-ink";

/**
 * The top nav on the public pages: landing, about, join, and pending.
 *
 * A member looking at one of these gets `MemberNav` itself — the same links,
 * the same avatar menu, the same underline on the current page — rather than a
 * second nav imitating it. There is one nav for being in the circle, wherever
 * in the site a member happens to be. Everyone else gets the public one.
 *
 * Asking who is looking makes these pages dynamic — they read the session
 * cookie — which costs a visitor with no session nothing.
 */
export async function SiteNav() {
  const viewer = await getViewer();
  if (viewer.kind === "member") return <MemberNav user={viewer.member} />;

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
        <Link href="/about" className={NAV_LINKS}>
          About
        </Link>
        {/* Someone signed in but not on the roster is already signed in;
            what they can still do is ask to join. */}
        {viewer.kind === "visitor" ? (
          <Link href="/signin" className={`${NAV_LINKS} text-ink`}>
            Sign in
          </Link>
        ) : null}
        <ButtonLink href="/join" size="sm">
          Join the circle
        </ButtonLink>
      </nav>
    </header>
  );
}

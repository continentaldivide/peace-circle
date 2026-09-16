import Link from "next/link";

import { RingMark } from "@/components/ring-mark";
import { ButtonLink } from "@/components/ui/button";
import { getViewer } from "@/lib/dal";

const NAV_BORDER = "border-b border-line";

const WORDMARK =
  "inline-flex items-center gap-[11px] font-display text-[20px] font-semibold text-ink";

const NAV_LINKS =
  "text-[15px] font-medium text-ink-soft transition-colors hover:text-ink";

/**
 * Public top nav shown on landing, about, join, and pending.
 *
 * Asks who is looking, because "Sign in" and "Join the circle" are the wrong
 * offer to someone already in the circle, and a member arriving here had no
 * way back to Home. Rendering it makes these pages dynamic — they read the
 * session cookie — which costs a visitor with no session nothing.
 */
export async function SiteNav() {
  const viewer = await getViewer();

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
        {viewer === "member" ? (
          <ButtonLink href="/home" size="sm">
            Home
          </ButtonLink>
        ) : (
          <>
            {/* Someone signed in but not on the roster is already signed in;
                what they can still do is ask to join. */}
            {viewer === "visitor" ? (
              <Link href="/signin" className={`${NAV_LINKS} text-ink`}>
                Sign in
              </Link>
            ) : null}
            <ButtonLink href="/join" size="sm">
              Join the circle
            </ButtonLink>
          </>
        )}
      </nav>
    </header>
  );
}

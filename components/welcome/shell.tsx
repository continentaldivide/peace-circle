import Link from "next/link";

import { RingMark } from "@/components/ring-mark";

/**
 * The frame both /welcome screens sit in.
 *
 * Deliberately not `SiteNav`: that nav offers "Sign in" and "Join the circle",
 * and someone who arrived here is already doing one of those. A wordmark and a
 * way back to the landing page is the whole of what this page needs.
 */
export function WelcomeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[80vh] flex-col">
      <header className="flex items-center justify-between gap-4 px-6 py-[22px] sm:px-14">
        <Link
          href="/"
          className="inline-flex items-center gap-[11px] font-display text-[20px] font-semibold text-ink"
        >
          <span className="text-accent">
            <RingMark size={26} rings={3} />
          </span>
          <span>Peace Circle</span>
        </Link>
        <Link
          href="/"
          className="font-body text-[15px] font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Back to home
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-[440px] flex-col gap-5 rounded-card border border-line bg-surface p-8 shadow-[var(--cardshadow)] sm:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}

/** The ring mark and heading every /welcome screen opens with. */
export function WelcomeHeading({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div className="text-accent">
        <RingMark size={40} rings={4} />
      </div>
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">
          {title}
        </h1>
        {children ? (
          <div className="mt-2 flex flex-col gap-3 font-body text-[15px] leading-relaxed text-ink-soft">
            {children}
          </div>
        ) : null}
      </div>
    </>
  );
}

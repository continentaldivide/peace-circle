import { SiteNav } from "@/components/site-nav";

/**
 * Themed placeholder for routes that exist in the nav/structure but aren't part
 * of the Phase 1 deliverable (About is Phase 1-optional; admin + pending are
 * Phase 4). Kept so the eventual route tree is navigable and themed.
 */
export function PlaceholderPage({
  eyebrow = "Coming later",
  title,
  blurb,
}: {
  eyebrow?: string;
  title: string;
  blurb: string;
}) {
  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent">
          {eyebrow}
        </p>
        <h1 className="font-display text-[40px] font-semibold text-ink option-b:font-light option-d:font-extrabold">
          {title}
        </h1>
        <p className="max-w-[48ch] font-body text-[16px] leading-[1.5] text-ink-soft">
          {blurb}
        </p>
      </main>
    </>
  );
}

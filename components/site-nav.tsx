"use client";

import Link from "next/link";

import { RingMark } from "@/components/ring-mark";
import { useSession } from "@/components/session";
import { ButtonLink } from "@/components/ui/button";
import { useVariant } from "@/components/variant-context";
import { variantPath } from "@/lib/variants";

const NAV_BORDER =
  "option-a:border-b option-a:border-line option-c:border-b-[3px] option-c:border-double option-c:border-accent option-d:border-b-2 option-d:border-ink";

const WORDMARK =
  "inline-flex items-center gap-[11px] font-display text-[20px] font-semibold text-ink option-b:text-[15px] option-b:font-medium option-b:uppercase option-b:tracking-[0.3em] option-d:font-extrabold option-d:tracking-[-0.02em]";

const NAV_LINKS =
  "text-[15px] font-medium text-ink-soft transition-colors hover:text-ink option-b:uppercase option-b:tracking-[0.2em] option-b:text-[13px] option-b:font-normal option-c:italic option-d:font-semibold";

/** Public top nav shown on landing / meetings / about. */
export function SiteNav() {
  const variant = useVariant();
  const { user } = useSession();
  const p = (path = "") => variantPath(variant, path);

  return (
    <header
      className={`flex flex-wrap items-center justify-between gap-x-5 gap-y-3 px-6 py-[22px] sm:px-14 ${NAV_BORDER}`}
    >
      <Link href={p()} className={WORDMARK}>
        <span className="text-accent">
          <RingMark size={22} rings={3} />
        </span>
        <span>Peace Circle</span>
      </Link>

      <nav className="flex flex-wrap items-center gap-x-[26px] gap-y-2">
        <Link href={user ? p("/library") : p("/signin")} className={NAV_LINKS}>
          The Library
        </Link>
        <Link href={p("/meetings")} className={NAV_LINKS}>
          Meetings
        </Link>
        <Link href={p("/about")} className={NAV_LINKS}>
          About
        </Link>
        <Link href={p("/signin")} className={`${NAV_LINKS} text-ink`}>
          Sign in
        </Link>
        <ButtonLink href={p("/join")} size="sm">
          Join the circle
        </ButtonLink>
      </nav>
    </header>
  );
}

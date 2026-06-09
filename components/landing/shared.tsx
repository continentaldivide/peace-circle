import Link from "next/link";

import { cn } from "@/lib/utils";

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-accent",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Lede({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "max-w-[48ch] font-body text-[19px] leading-[1.6] text-ink-soft",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Quiet text link that sits next to a primary CTA. */
export function LinkCta({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-body text-[15px] font-semibold text-ink-soft transition-colors hover:text-ink"
    >
      {children}
    </Link>
  );
}

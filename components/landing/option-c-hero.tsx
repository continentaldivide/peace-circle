import { Lede } from "@/components/landing/shared";
import { ButtonLink } from "@/components/ui/button";
import { variantPath, type VariantKey } from "@/lib/variants";

/** Option C: centered, classical, inside a framed box with a double-rule top. */
export function OptionCHero({ variant }: { variant: VariantKey }) {
  return (
    <section className="flex flex-1 items-center justify-center px-6 py-12 text-center">
      <div className="w-full max-w-[760px] rounded-card border border-line-strong px-8 py-10 [border-top:3px_double_var(--accent)] sm:px-14">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink-soft">
          Established 2021 · Non-denominational
        </p>
        <h1 className="mt-6 font-display text-[clamp(40px,6vw,66px)] font-semibold leading-[1.04] tracking-[-0.01em] text-ink">
          An hour of stillness, kept{" "}
          <em className="font-medium italic text-accent">together</em>.
        </h1>
        <p className="my-6 font-display text-[18px] tracking-[0.6em] text-accent">
          • • •
        </p>
        <Lede className="mx-auto text-center text-[18px]">
          Peace Circle is a small, non-religious gathering inspired by the monks
          who walk for peace. Once a month we sit together in quiet, and share
          what steadies us.
        </Lede>
        <div className="mx-auto my-6 h-0 w-16 border-t-2 border-accent" />
        <div className="mb-7 flex justify-center">
          <ButtonLink href={variantPath(variant, "/join")}>
            Join the circle
          </ButtonLink>
        </div>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink-soft">
          Third Sunday · Monthly · Grace United Church
        </p>
      </div>
    </section>
  );
}

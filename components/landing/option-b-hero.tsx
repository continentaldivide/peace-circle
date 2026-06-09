import { Lede } from "@/components/landing/shared";
import { RingMark } from "@/components/ring-mark";
import { ButtonLink } from "@/components/ui/button";
import { variantPath, type VariantKey } from "@/lib/variants";

/** Option B: centered, airy, ring mark + a horizon hairline through the middle. */
export function OptionBHero({ variant }: { variant: VariantKey }) {
  return (
    <section className="relative flex flex-1 flex-col px-6 py-12 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent"
      />
      <div className="relative grid flex-1 place-items-center">
        <div className="flex flex-col items-center">
          <span className="mb-9 text-accent">
            <RingMark size={46} rings={4} />
          </span>
          <h1 className="font-display text-[clamp(38px,6vw,62px)] font-light leading-[1.12] tracking-[0.005em] text-ink">
            Peace, one breath at a time.
          </h1>
          <Lede className="mx-auto mt-[26px] text-center font-light">
            A non-religious community that meets each month to sit in stillness,
            share a reflection, and find a little quiet — together.
          </Lede>
          <div className="mt-10 flex items-center justify-center">
            <ButtonLink href={variantPath(variant, "/join")}>
              Join the circle
            </ButtonLink>
          </div>
        </div>
      </div>
      <p className="relative pt-8 font-body text-[12px] font-light uppercase tracking-[0.2em] text-faint">
        Third Sunday · Grace United Church
      </p>
    </section>
  );
}

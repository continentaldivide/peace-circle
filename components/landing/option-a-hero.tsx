import { Eyebrow, Lede, LinkCta } from "@/components/landing/shared";
import { ButtonLink } from "@/components/ui/button";
import { variantPath, type VariantKey } from "@/lib/variants";

const PURPOSE = [
  {
    n: "01",
    h: "Once a month",
    p: "We gather at a local church to sit together in quiet, then share a cup of tea.",
  },
  {
    n: "02",
    h: "No doctrine",
    p: "Non-religious and open. Bring whatever you believe, or nothing at all.",
  },
  {
    n: "03",
    h: "Between meetings",
    p: "Members pass along quotes and readings that keep them steady through the month.",
  },
];

/** Option A: left-aligned, serif, with the 3-up purpose strip pinned to the bottom. */
export function OptionAHero({ variant }: { variant: VariantKey }) {
  return (
    <section className="flex flex-1 flex-col px-6 pt-12 sm:px-14 sm:pt-16">
      <Eyebrow>A community inspired by monks who walk for peace</Eyebrow>
      <h1 className="mt-[18px] max-w-[15ch] font-display text-[clamp(44px,8vw,80px)] font-medium leading-[1.02] tracking-[-0.02em] text-ink">
        Find a quieter way forward,{" "}
        <em className="italic text-accent">together</em>.
      </h1>
      <Lede className="mt-[26px]">
        Peace Circle is a small, non-religious group inspired by the monks who
        walk for peace. Once a month we gather to sit together in stillness and
        share what keeps us steady.
      </Lede>
      <div className="mt-8 flex flex-wrap items-center gap-[22px]">
        <ButtonLink href={variantPath(variant, "/join")}>
          Join the circle
        </ButtonLink>
        <LinkCta href={variantPath(variant, "/meetings")}>What we do →</LinkCta>
      </div>

      <div className="mt-auto grid grid-cols-1 gap-10 border-t border-line py-10 sm:grid-cols-3">
        {PURPOSE.map((it) => (
          <div key={it.n}>
            <p className="font-mono text-[13px] font-bold text-accent">
              {it.n}
            </p>
            <h4 className="mt-2.5 font-display text-[20px] font-semibold text-ink">
              {it.h}
            </h4>
            <p className="mt-1.5 font-body text-[14.5px] leading-[1.55] text-ink-soft">
              {it.p}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

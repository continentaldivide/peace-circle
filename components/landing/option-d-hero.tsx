import { Eyebrow, Lede, LinkCta } from "@/components/landing/shared";
import { ButtonLink } from "@/components/ui/button";
import { variantPath, type VariantKey } from "@/lib/variants";

const FACTS = [
  { label: "Cadence", value: "Monthly" },
  { label: "Doctrine", value: "None" },
  { label: "Open to", value: "Everyone" },
];

/** Option D: hard-edged 2-column color block — ink text left, solid pine panel right. */
export function OptionDHero({ variant }: { variant: VariantKey }) {
  return (
    <section className="grid flex-1 grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="flex flex-col px-6 py-12 sm:px-14">
        <Eyebrow>Peace Circle — est. 2021</Eyebrow>
        <h1 className="mt-4 font-display text-[clamp(48px,9vw,88px)] font-black uppercase leading-[0.92] tracking-[-0.035em] text-ink">
          Be still, together.
        </h1>
        <Lede className="mt-[26px]">
          A non-religious community inspired by the monks who walk for peace. We
          meet once a month to sit in stillness — no doctrine, just good
          company.
        </Lede>
        <div className="mt-8 flex flex-wrap items-center gap-[22px]">
          <ButtonLink href={variantPath(variant, "/join")}>
            Join the circle
          </ButtonLink>
          <LinkCta href={variantPath(variant, "/meetings")}>
            What we do →
          </LinkCta>
        </div>
        <dl className="mt-auto flex flex-wrap gap-[30px] border-t-2 border-ink pt-6 font-mono text-[12px] uppercase tracking-[0.06em] text-ink-soft">
          {FACTS.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd className="mt-1 font-body text-[15px] font-bold normal-case tracking-normal text-ink">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative grid min-h-[280px] place-items-center bg-accent text-accent-ink">
        <span className="absolute left-[30px] top-[30px] font-mono text-[12px] uppercase tracking-[0.14em] opacity-80">
          From the library
        </span>
        <blockquote className="p-[50px] font-display text-[clamp(24px,3vw,30px)] font-semibold leading-[1.25] tracking-[-0.01em]">
          “Within you there is a stillness to which you can retreat at any
          time.”
          <cite className="mt-[18px] block font-mono text-[12px] uppercase not-italic tracking-[0.1em] opacity-80">
            — Hermann Hesse
          </cite>
        </blockquote>
      </div>
    </section>
  );
}

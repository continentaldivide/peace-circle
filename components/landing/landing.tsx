import { OptionCHero } from "@/components/landing/option-c-hero";
import { OptionBHero } from "@/components/landing/option-b-hero";
import { OptionAHero } from "@/components/landing/option-a-hero";
import { OptionDHero } from "@/components/landing/option-d-hero";
import type { VariantKey } from "@/lib/variants";

/** Picks the structurally-distinct hero for the active variant. */
export function Landing({ variant }: { variant: VariantKey }) {
  switch (variant) {
    case "option-b":
      return <OptionBHero variant={variant} />;
    case "option-c":
      return <OptionCHero variant={variant} />;
    case "option-d":
      return <OptionDHero variant={variant} />;
    default:
      return <OptionAHero variant={variant} />;
  }
}

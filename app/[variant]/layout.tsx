import { notFound } from "next/navigation";

import { PrototypeBar } from "@/components/prototype-bar";
import { SessionProvider } from "@/components/session";
import { VariantProvider } from "@/components/variant-context";
import { isVariant, VARIANT_KEYS } from "@/lib/variants";

// Prerender the four variant segments at build time.
export function generateStaticParams() {
  return VARIANT_KEYS.map((variant) => ({ variant }));
}

export default async function VariantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;
  if (!isVariant(variant)) notFound();

  return (
    <SessionProvider>
      <VariantProvider variant={variant}>
        {/* Scaffold strip — stays neutral, outside the themed wrapper. */}
        <PrototypeBar currentVariant={variant} />
        {/* data-variant selects the token set + treatments for everything below. */}
        <div
          data-variant={variant}
          className="flex flex-1 flex-col bg-bg font-body text-ink"
        >
          {children}
        </div>
      </VariantProvider>
    </SessionProvider>
  );
}

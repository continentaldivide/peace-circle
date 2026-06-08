import { notFound } from "next/navigation";

import { DesignProvider } from "@/components/design-context";
import { PrototypeBar } from "@/components/prototype-bar";
import { DESIGN_KEYS, isDesignKey } from "@/designs/meta";

// Prerender the known design segments at build time.
export function generateStaticParams() {
  return DESIGN_KEYS.map((design) => ({ design }));
}

export default async function DesignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ design: string }>;
}) {
  const { design } = await params;
  if (!isDesignKey(design)) notFound();

  return (
    <DesignProvider design={design}>
      <PrototypeBar currentDesign={design} />
      {children}
    </DesignProvider>
  );
}

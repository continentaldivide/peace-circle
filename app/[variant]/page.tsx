import { Landing } from "@/components/landing/landing";
import { SiteNav } from "@/components/site-nav";
import { isVariant } from "@/lib/variants";
import { notFound } from "next/navigation";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;
  if (!isVariant(variant)) notFound();

  return (
    <>
      <SiteNav />
      <Landing variant={variant} />
    </>
  );
}

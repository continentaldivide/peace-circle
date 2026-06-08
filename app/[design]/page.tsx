import { getDesignPages } from "@/designs/registry";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ design: string }>;
}) {
  const { design } = await params;
  const { Landing } = getDesignPages(design);
  return <Landing />;
}

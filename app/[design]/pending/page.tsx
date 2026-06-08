import { getDesignPages } from "@/designs/registry";

export default async function PendingPage({
  params,
}: {
  params: Promise<{ design: string }>;
}) {
  const { design } = await params;
  const { Pending } = getDesignPages(design);
  return <Pending />;
}

import { getDesignPages } from "@/designs/registry";

export default async function FeedPage({
  params,
}: {
  params: Promise<{ design: string }>;
}) {
  const { design } = await params;
  const { Feed } = getDesignPages(design);
  return <Feed />;
}

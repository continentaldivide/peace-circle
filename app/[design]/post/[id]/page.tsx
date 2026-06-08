import { getDesignPages } from "@/designs/registry";

export default async function PostPage({
  params,
}: {
  params: Promise<{ design: string; id: string }>;
}) {
  const { design, id } = await params;
  const { Post } = getDesignPages(design);
  return <Post id={id} />;
}

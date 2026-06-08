import { getDesignPages } from "@/designs/registry";

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ design: string }>;
}) {
  const { design } = await params;
  const { Library } = getDesignPages(design);
  return <Library />;
}

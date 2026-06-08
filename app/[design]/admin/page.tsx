import { getDesignPages } from "@/designs/registry";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ design: string }>;
}) {
  const { design } = await params;
  const { Admin } = getDesignPages(design);
  return <Admin />;
}

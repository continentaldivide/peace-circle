import { getDesignPages } from "@/designs/registry";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ design: string }>;
}) {
  const { design } = await params;
  const { Calendar } = getDesignPages(design);
  return <Calendar />;
}

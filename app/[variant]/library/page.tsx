import { LibraryView } from "@/components/library/library-view";
import { getMembers, getResources } from "@/lib/data";

export default async function LibraryPage() {
  const [resources, members] = await Promise.all([
    getResources(),
    getMembers(),
  ]);
  return <LibraryView initialResources={resources} members={members} />;
}

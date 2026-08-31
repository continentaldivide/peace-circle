import { LibraryView } from "@/components/library/library-view";
import { getMembers, getResources } from "@/lib/data";
import { getSignedInMember } from "@/lib/dal";

export default async function LibraryPage() {
  // The gate, before any member content is read or rendered.
  const user = await getSignedInMember();

  const [resources, members] = await Promise.all([
    getResources(),
    getMembers(),
  ]);

  return (
    <LibraryView user={user} initialResources={resources} members={members} />
  );
}

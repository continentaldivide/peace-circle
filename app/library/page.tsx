import { LibraryView } from "@/components/library/library-view";
import { getMembers, getResources } from "@/lib/data";
import { getSignedInMember } from "@/lib/dal";

export default async function LibraryPage() {
  // The gate, before any member content is read or rendered.
  const user = await getSignedInMember();

  // One instant for every "today", "just now", and greeting on the page. Taken
  // here, on the server, and passed down so the browser hydrates against the
  // same moment instead of reading its own clock (see lib/time.ts).
  const now = new Date().toISOString();

  const [resources, members] = await Promise.all([
    getResources(),
    getMembers(),
  ]);

  return (
    <LibraryView
      user={user}
      now={now}
      initialResources={resources}
      members={members}
    />
  );
}

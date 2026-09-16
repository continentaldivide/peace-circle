import { LibraryView } from "@/components/library/library-view";
import { getMembers, getResources } from "@/lib/data";
import { getSignedInMember } from "@/lib/dal";
import { normalizeSearch } from "@/lib/search";

export default async function LibraryPage({
  searchParams,
}: {
  // A Promise in Next 16, and a request-time API: reading it is what makes
  // this page dynamic, which it already was behind the gate.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // The gate, before any member content is read or rendered.
  const user = await getSignedInMember();

  // One instant for every "today", "just now", and greeting on the page. Taken
  // here, on the server, and passed down so the browser hydrates against the
  // same moment instead of reading its own clock (see lib/time.ts).
  const now = new Date().toISOString();

  // Normalised once, here, and then passed *both* ways: to the query and back
  // to the search box. So the words in the field are the words that were
  // searched for, and the "nothing matches" line quotes the query as run.
  const query = normalizeSearch((await searchParams).q);

  const [resources, members] = await Promise.all([
    getResources({ search: query }),
    getMembers(),
  ]);

  return (
    <LibraryView
      user={user}
      now={now}
      query={query}
      resources={resources}
      members={members}
    />
  );
}

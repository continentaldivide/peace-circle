import { HomeView } from "@/components/home/home-view";
import {
  getCircleEvents,
  getMembers,
  getMessages,
  getResources,
} from "@/lib/data";
import { getSignedInMember } from "@/lib/dal";

export default async function HomePage() {
  // The gate, before any member content is read or rendered. Not in a layout:
  // layouts do not re-render on client-side navigation.
  const user = await getSignedInMember();

  // One instant for every "today", "just now", and greeting on the page. Taken
  // here, on the server, and passed down so the browser hydrates against the
  // same moment instead of reading its own clock (see lib/time.ts).
  const now = new Date().toISOString();

  const [resources, members, messagePage, events] = await Promise.all([
    getResources(),
    getMembers(),
    getMessages(),
    getCircleEvents(),
  ]);

  return (
    <HomeView
      user={user}
      now={now}
      resources={resources}
      members={members}
      messagePage={messagePage}
      events={events}
    />
  );
}

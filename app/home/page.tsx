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

  const [resources, members, messagePage, events] = await Promise.all([
    getResources(),
    getMembers(),
    getMessages(),
    getCircleEvents(),
  ]);

  return (
    <HomeView
      user={user}
      initialResources={resources}
      members={members}
      messagePage={messagePage}
      events={events}
    />
  );
}

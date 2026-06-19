import { HomeView } from "@/components/home/home-view";
import {
  getCircleEvents,
  getMembers,
  getMessages,
  getResources,
} from "@/lib/data";

export default async function HomePage() {
  const [resources, members, messages, events] = await Promise.all([
    getResources(),
    getMembers(),
    getMessages(),
    getCircleEvents(),
  ]);
  return (
    <HomeView
      initialResources={resources}
      members={members}
      messages={messages}
      events={events}
    />
  );
}

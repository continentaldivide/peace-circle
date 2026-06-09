import { Meetings } from "@/components/meetings/meetings";
import { SiteNav } from "@/components/site-nav";
import { getNextMeeting, getUpcomingMeetings } from "@/lib/data";

export default async function MeetingsPage() {
  const [next, upcoming] = await Promise.all([
    getNextMeeting(),
    getUpcomingMeetings(),
  ]);
  return (
    <>
      <SiteNav />
      <Meetings next={next} upcoming={upcoming} />
    </>
  );
}

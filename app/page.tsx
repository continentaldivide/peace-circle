import { Hero } from "@/components/landing/hero";
import { SiteNav } from "@/components/site-nav";
import { getViewer } from "@/lib/dal";

/**
 * The public landing page, for everyone — members included.
 *
 * Not a redirect to /home for a signed-in member. Until /about is written this
 * page is the only place the circle describes itself, and a member should be
 * able to read it or send someone to it. What changes for them is what it
 * offers: "Home" rather than "Sign in" and "Join". `getViewer()` is cached per
 * request, so this and the nav share one lookup.
 */
export default async function LandingPage() {
  const viewer = await getViewer();
  return (
    <>
      <SiteNav />
      <Hero member={viewer === "member"} />
    </>
  );
}

import { redirect } from "next/navigation";

import { signOutAction } from "@/app/actions/auth";
import { RingMark } from "@/components/ring-mark";
import { SiteNav } from "@/components/site-nav";
import { ButtonLink } from "@/components/ui/button";
import { getOwnProfile, verifySession } from "@/lib/dal";

/**
 * "You're signed in, but you're not on the roster."
 *
 * The one screen that proves authentication and authorization are separate:
 * everyone here holds a valid session and can still read nothing member-facing.
 * It deliberately calls `getOwnProfile()` rather than `requireApproved()` —
 * the latter redirects here, which would loop.
 */
export default async function PendingPage() {
  const session = await verifySession();

  // Nobody is signed in, so there is nothing pending — this is just a stray
  // visit to the URL.
  if (!session) redirect("/signin");

  const profile = await getOwnProfile();

  // An approved member who lands here (an old bookmark, a stale link) belongs
  // in the circle, not on a waiting screen.
  if (profile?.status === "approved") redirect("/home");

  const revoked = profile?.status === "revoked";

  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <span className="text-accent">
          <RingMark size={44} rings={4} />
        </span>
        <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent">
          {revoked ? "Your place is closed" : "Not on the roster yet"}
        </p>
        <h1 className="font-display text-[40px] font-semibold text-ink">
          {revoked
            ? "You've stepped out of the circle"
            : "We don't know you yet"}
        </h1>
        <p className="max-w-[52ch] font-body text-[16px] leading-[1.5] text-ink-soft">
          {revoked ? (
            <>
              You&rsquo;re signed in as <strong>{session.email}</strong>, but
              your place in the circle has been closed. If that seems wrong,
              reply to any note from us and we&rsquo;ll sort it out.
            </>
          ) : (
            <>
              You&rsquo;re signed in as <strong>{session.email}</strong>, and
              that part worked. But the Peace Circle isn&rsquo;t something you
              can join by signing up — a couple of us read every note and write
              back. Tell us a little about yourself and we&rsquo;ll be in touch.
            </>
          )}
        </p>

        {!revoked ? (
          <div className="mt-2">
            <ButtonLink href="/join">Tell us about yourself</ButtonLink>
          </div>
        ) : null}

        <form action={signOutAction} className="mt-1">
          <button
            type="submit"
            className="cursor-pointer font-body text-[14px] font-medium text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            Sign out
          </button>
        </form>
      </main>
    </>
  );
}

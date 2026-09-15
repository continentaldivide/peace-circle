import Link from "next/link";
import { redirect } from "next/navigation";

import { FinishProfile } from "@/components/welcome/finish-profile";
import { RequestLink } from "@/components/welcome/request-link";
import { WelcomeHeading, WelcomeShell } from "@/components/welcome/shell";
import { ButtonLink } from "@/components/ui/button";
import { getOwnProfile, verifySession } from "@/lib/dal";
import type { LaunchCodeRefusal } from "@/lib/onboarding";
import { redeemLaunchCode } from "@/lib/onboarding";

/**
 * Where both ways into the circle land.
 *
 * A launch code arrives as `?code=`, and the visit happens twice: once before
 * signing in, to collect a name and send a magic link, and once after, with
 * the code carried back through the callback's `next` parameter. The second
 * visit is the one that redeems.
 *
 * Redeeming during a render is worth being deliberate about, since a GET that
 * mutates is normally a mistake. It is safe here because `redeem_launch_code`
 * is idempotent per person: a second call from someone who already has a
 * profile returns `already_member` and spends no seat. So a re-render, a
 * reload, or a link prefetched by something else costs nothing. The
 * alternative — an extra button between the magic link and Member Home — would
 * buy nothing but a click.
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const session = await verifySession();

  if (!session) {
    return (
      <WelcomeShell>
        {code ? <RequestLink code={code} /> : <NoWayIn />}
      </WelcomeShell>
    );
  }

  // Redeemed before the profile is read, not after, because `getOwnProfile` is
  // wrapped in React `cache()` — reading first and redeeming second would leave
  // the freshly created profile invisible for the rest of the render. The
  // function is also the right place to ask "are they already a member?", so
  // there is nothing to check beforehand.
  const outcome = code ? await redeemLaunchCode(code) : null;
  const profile = await getOwnProfile();

  if (profile?.status === "approved") {
    return (
      <WelcomeShell>
        <FinishProfile
          initialName={profile.name}
          initialTint={profile.avatar_tint}
        />
      </WelcomeShell>
    );
  }

  // A profile that is not approved is a revoked one. /pending says that
  // kindly, and a launch code is deliberately not a way back in.
  if (profile) redirect("/pending");

  if (outcome && outcome !== "redeemed" && outcome !== "already_member") {
    return (
      <WelcomeShell>
        <CodeRefused outcome={outcome} />
      </WelcomeShell>
    );
  }

  // Signed in, no profile, and no code that could make one: the same place a
  // stranger who guessed their way to /signin ends up.
  redirect("/pending");
}

/** Why the code did not work, in the visitor's terms rather than the enum's. */
const REFUSALS: Record<LaunchCodeRefusal, { title: string; body: string }> = {
  not_found: {
    title: "We don't recognise that code",
    body: "It may have been mistyped, or the link may have lost part of itself on the way. Codes are not case-sensitive, so that part is safe to get wrong.",
  },
  expired: {
    title: "That code has expired",
    body: "Launch codes are open for a while and then close again. Yours has closed, but the door hasn't — tell us about yourself and we'll write back.",
  },
  exhausted: {
    title: "That code has been fully used",
    body: "Each code is good for a set number of people, and this one has reached it. Tell us about yourself and we'll sort you out directly.",
  },
  // Not reachable from the page — a revoked person has a profile, and is sent
  // to /pending above — but the enum has the case, so this has an answer.
  revoked: {
    title: "That code won't reopen your place",
    body: "Your place in the circle was closed. If that seems wrong, reply to any note from us and we'll sort it out.",
  },
};

function CodeRefused({ outcome }: { outcome: LaunchCodeRefusal }) {
  const { title, body } = REFUSALS[outcome];
  return (
    <>
      <WelcomeHeading title={title}>
        <p>{body}</p>
      </WelcomeHeading>
      <div>
        <ButtonLink href="/join">Tell us about yourself</ButtonLink>
      </div>
      <p className="text-center font-body text-[14px] text-ink-soft">
        Already a member?{" "}
        <Link href="/signin" className="font-medium text-accent">
          Sign in instead
        </Link>
      </p>
    </>
  );
}

/** Someone who found the URL without the thing that makes it work. */
function NoWayIn() {
  return (
    <>
      <WelcomeHeading title="This page needs an invitation">
        <p>
          You can&rsquo;t sign up for the Peace Circle — you&rsquo;re let in,
          either by an invitation we send you or by a code shared with the
          group. This page is where both of those land.
        </p>
        <p>If you have neither yet, start by telling us about yourself.</p>
      </WelcomeHeading>
      <div>
        <ButtonLink href="/join">Tell us about yourself</ButtonLink>
      </div>
      <p className="text-center font-body text-[14px] text-ink-soft">
        Already a member?{" "}
        <Link href="/signin" className="font-medium text-accent">
          Sign in instead
        </Link>
      </p>
    </>
  );
}

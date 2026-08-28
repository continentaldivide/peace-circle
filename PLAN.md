# Peace Circle — Implementation Plan

A web app for the Peace Circle community group: a place for approved members to
share resources (quotes, links, pictures, books), discuss them, and track
upcoming gatherings.

The UI is built and the database schema is in place. What remains is connecting
them: real auth, real writes, and the onboarding paths. This document is the
plan for that work.

---

## Feature summary

- **Public landing page** — hero statement + call to action for new visitors.
- **Passwordless auth** — magic link via email; no passwords, ever.
- **Interest form** — new visitors submit an inquiry (how they heard, who
  referred them); a couple of admins are emailed and vet by reply.
- **Invite / launch-code gate** — member access is granted by an admin invite or
  a shared launch code, never by self-service sign-up. Enforced in RLS.
- **Member Home** — a dashboard landing: greeting, this-month calendar, upcoming
  gatherings, recently shared, and The Circle chat.
- **The Circle group chat** — a group-text feed for the whole circle, with
  cursor-paginated history. Realtime updates are out of scope for now.
- **Library of shares** — quotes, links, pictures, and books the circle passes
  along; newest first.
- **Searchable library** — full-text search over past shares.
- **Commentable shares** — comment threads; no likes or reactions.
- **Events calendar** — upcoming gatherings, admin-managed.

---

## Stack

- **Next.js 16 (App Router)** front end, styled with **Tailwind**.
- **Supabase** backend: Auth (magic links), Postgres (data + full-text search),
  Storage (images), Row-Level Security (the approval gate).
- **Resend** for transactional email / magic-link delivery.
- **Vercel** for production hosting.

Supabase covers auth, database, search, and file storage in one service, so
there's nothing extra to bolt on. A monthly-meeting community group fits
comfortably inside the free tier (~500 MB database, ~1 GB file storage), so net
monthly cost is effectively $0 in services plus ~$10–15/year for a domain.

### Free-tier constraints to design around

1. **Supabase pauses free projects after ~7 days of inactivity.** For a group
   that's quiet between monthly meetings, the first visitor after a quiet
   stretch could hit a sleeping database. A weekly GitHub Action pinging a
   health endpoint keeps it awake.
2. **No automatic backups on the free tier.** Add a scheduled `pg_dump`, also
   free via GitHub Actions.
3. **Supabase's built-in email sender is rate-limited** (a handful per hour;
   meant for testing). Wire in Resend **before the first _hosted_ magic-link
   test**, or the links will silently throttle. Local development is unaffected:
   `supabase start` runs a mail catcher (Mailpit, on port 54324) that receives
   every auth email instantly with no sending domain and no rate limit.

### The Vercel caveat

Vercel's free Hobby plan restricts use to **personal, non-commercial** projects,
and Pro is $20/user/mo. The Peace Circle is an unincorporated community group
with no revenue, which reads as non-commercial, but it's a judgment call rather
than a bright line.

The mitigation is to stay portable: the app is a plain Node.js Next.js server
(`next build` / `next start`) with no Vercel-only APIs, so moving hosts is a
redeploy rather than a rewrite. **Keep it that way** — avoid Vercel-proprietary
primitives so the exit stays cheap.

---

## Two architectural commitments

Everything below rests on these. Breaking either one is what turns a small
change into a rewrite.

### The data-access seam

**All** data reads go through `lib/data/index.ts` — `getResources()`,
`getMessages()`, `getEvents()`. Components never touch the data source directly
and never learn where the data came from. Swapping mock arrays for Supabase
queries changes only the insides of those functions.

### The access gate lives in the database

The gate must live in **RLS policies** keyed on an `approved` profile, not in
the front end. Anyone can request a magic link and sign in, but a user
**without** an approved profile must be able to read or write **nothing**
member-facing, so a hidden UI element or a poked API call can't leak the
circle's contents. The public `inquiries` insert is the one anon-writable path,
and it is write-only.

`supabase/tests/rls.test.sql` asserts exactly this. Treat those tests as the
definition of the gate: extend them whenever a policy changes, and never let
them go red. Run with `supabase test db`.

---

## Status

The app runs entirely on mock data behind a fake session. Everything in the
member area is real UI over `lib/data/mock.ts`, and the database exists locally
but nothing is wired to it yet.

Still stubbed or missing:

- **Auth is a localStorage stub** (`components/session.tsx`). The member-area
  gate is a client-side `useEffect` → `router.replace("/join")` in
  `home-view.tsx` and `library-view.tsx`. That's a UI curtain, not a gate —
  view-source reveals everything.
- **All mutations are client state.** Composing a share, adding a comment, and
  sending a chat message update React state and vanish on reload.
- **No uploads.** Picture resources carry a `placeholder` string; the composer's
  drop zone is decorative.
- **No search.** The Library filters by kind in memory.
- **No hosted Supabase project, no email.**
- **Placeholder pages** — `/about`, `/pending`, and `/admin` render
  `PlaceholderPage`.

---

## The plan

Eight steps, ordered so each rests on the last. Steps 1–3 are the risky part;
after that it's filling in features behind a working gate.

### Step 1 — Hosted Supabase project

Local development already works against `supabase start`. This step creates the
destination.

- Create the project; save the database password somewhere durable (it's
  resettable, not recoverable).
- Save its keys to `.env.local`. Use the **publishable/secret** keys —
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  (`sb_publishable_…`), and a server-only `SUPABASE_SECRET_KEY` (`sb_secret_…`).
  The older `anon` / `service_role` JWT keys are deprecated by the end of 2026.
- **The secret key must never carry a `NEXT_PUBLIC_` prefix.** That prefix
  inlines the value into the browser bundle at build time, handing every visitor
  RLS-bypassing access to the whole database.
- `supabase link --project-ref <ref>` then `supabase db push`. Migrations ship;
  `seed.sql` does not, so the fictional seed members stay local.
- Add Circle admins' real addresses to `admin_emails` as its own small
  migration, so the bootstrap is reproducible rather than a one-off statement
  someone has to remember. They become approved admins on first sign-in.

### Step 2 — Real auth (replaces the stub)

> **Next.js 16 gotcha:** Supabase's published SSR guide says `middleware.ts`. In
> Next 16 that file is **`proxy.ts`**, exporting a function named `proxy`, and
> the `edge` runtime is _not_ supported there — proxy is Node.js-only and not
> configurable. Copying the Supabase docs verbatim will not work.

- Add `@supabase/ssr`; create `lib/supabase/{client,server}.ts` for the browser
  and server (cookie-backed) clients.
- Add `proxy.ts` at the repo root for session refresh, per the note above.
- **Wire Resend as the SMTP provider _before_ testing magic links against the
  hosted project**, or the built-in sender will silently throttle you. This is
  not a prerequisite for the rest of this step: build and round-trip auth
  locally against Mailpit first, and treat the hosted test as its own milestone.
- Add `app/auth/callback/route.ts` to exchange the code for a session.
- Build `lib/dal.ts`: `verifySession()` and `requireApproved()`, both wrapped in
  React `cache()`, with `import "server-only"` at the top. This is the pattern
  the bundled Next.js 16 auth guide prescribes.
- **Delete `components/session.tsx`** and the `useEffect` redirects in
  `home-view.tsx` and `library-view.tsx`. Member pages become server components
  that call `requireApproved()` and `redirect()` before rendering anything. The
  gate moves from the client to the server _and_ the database.
- `/pending` becomes the real "you're signed in but not on the roster" screen.

### Step 3 — Onboarding paths

Implements **Member sign-up & onboarding** below.

- Rewrite `/join` as the **interest form** (it currently simulates instant
  signup): honeypot field, per-IP rate limit, insert an `inquiries` row, email
  `ADMIN_NOTIFY_EMAILS` via Resend with **reply-to set to the applicant**, then
  show the warm confirmation. No auth, no magic link.
- Add `/welcome`, handling both the per-person invite token and `?code=`
  launch-code redemption, ending in the short finish-profile step.
- Launch-code redemption must check `expires_at` and `max_uses` and increment
  `uses` **atomically** — do it in a Postgres function, not in application code,
  or two simultaneous redemptions can both pass the cap check.

### Step 4 — Swap the data seam

Replace the bodies of the `lib/data/index.ts` functions with Supabase queries,
each going through the DAL first. Then delete `lib/data/mock.ts`.

Three shape changes make this bigger than it sounds:

- **Times are pre-formatted strings.** `Message.day` / `Message.when`,
  `Resource.when`, `Comment.when`, and `Meeting.{month,day,time}` are display
  labels ("Yesterday", "4:12 PM", "just now"). Postgres returns `timestamptz`,
  so formatting has to move out of the data layer and into the components. This
  is the largest single piece of churn here and the easiest to underestimate.
- **`getMessages()`'s cursor** changes from a message id to a timestamp:
  `.lt("created_at", before).order("created_at", { ascending: false }).limit(n)`,
  then reverse for display. The index is `(created_at desc, id desc)` so pages
  stay stable when two messages share a timestamp.
- **`NextMeeting` is a denormalized blob** (`expect[]`, `goodToKnow{}`). Derive
  it from the next `events` row instead — one table already feeds the calendar,
  the upcoming list, and the next-gathering detail.

Also: `authorId: "you"` is a sentinel for the signed-in member and becomes a
real `profiles.id`; and the seam maps the `avatar_tint` column to the `tint`
field the components expect, so no component changes.

### Step 5 — Real writes

Server actions for composing a share, adding a comment, and sending a chat
message, replacing the client-state mutations in `composer.tsx`,
`resource-detail.tsx`, and `circle-chat.tsx`.

> **Next.js 16 caching APIs changed** — don't use remembered patterns:
>
> - `revalidateTag(tag)` now requires a second argument:
>   `revalidateTag(tag, "max")`. The one-argument form is a TypeScript error.
> - Prefer **`updateTag(tag)`** in server actions — it expires and refreshes in
>   the same request, giving read-your-writes semantics, which is what every one
>   of these mutations wants (the member should see their own post immediately).
> - **`refresh()`** refreshes the client router from inside a server action.

Keep optimistic UI on the chat send so it stays feeling like a group text.

### Step 6 — Search, uploads, calendar

- Full-text search over the `resources.search` tsvector, wired into the
  Library's existing filter bar.
- Real image uploads to Supabase Storage; replace `PictureResource.placeholder`
  with `image_path` and render via `next/image`. Note Next 16 changed
  `next/image` defaults (`minimumCacheTTL`, `imageSizes`, `qualities`, and local
  images with query strings).
- Point the Meetings page and Home calendar at the real `events` table.

### Step 7 — Admin & polish

- Replace the `/admin` placeholder with the inquiry queue
  (`new → reviewing → invited → joined` / `declined`), the Invite action
  (`inviteUserByEmail` + branded Resend template), moderation (delete a
  share/comment), and event management.
- Write the `/about` page.
- Empty states, error boundaries, and a mobile pass.
- Replace the create-next-app boilerplate in `README.md`.

### Step 8 — Launch

- Point the domain and verify the Resend sending domain.
- Generate the launch code, set its expiry, distribute it to the cohort.
- Seed starter content so the Library isn't empty on day one.
- Set up the two free-tier chores: the weekly keep-alive ping and the scheduled
  `pg_dump` backup.
- Onboard members.

### Testing

The RLS suite in `supabase/tests/` is the security gate and should grow with the
policies. Beyond that, the highest-value additions are end-to-end tests of the
auth and onboarding flows once Steps 2–3 land — a magic-link round trip and a
launch-code redemption. Next.js ships guides for Vitest and Playwright in
`node_modules/next/dist/docs/01-app/02-guides/testing/`.

---

## Member sign-up & onboarding

Sign-up is deliberately _not_ self-service. The Peace Circle is a small,
personal group, so joining runs through a human vetting conversation. The public
form is an **inquiry**, not an account; access is created only afterward, by an
admin invite or a shared launch code.

### Two layers, kept separate

- **Authentication** (magic link, passwordless) only proves you own an email
  address. Anyone can request one.
- **Authorization** (seeing member content) requires an **approved profile**,
  enforced in RLS. Signing in with a magic link, by itself, grants nothing.

So a stranger who guesses their way to `/signin` can authenticate but lands on a
"you're not on the roster yet" screen — the database, not the UI, keeps them
out.

### Three entry points, one end state

All three converge on an authenticated member with an `approved` profile:

1. **Interest form** (strangers) → vetting over email → admin invite.
2. **Invite link** (post-vetting, per person) → approved profile.
3. **Launch code** (the existing cohort at launch) → approved profile.

### 1. Public interest form (`/join`)

Fields:

- Name (required)
- Email (required)
- "How did you hear about the Peace Circle?" (required)
- "Were you referred by a current member? If so, who?" (optional)
- "Anything you'd like us to know?" (optional)
- A hidden honeypot field + a light per-IP rate limit for spam.

On submit it (a) inserts an `inquiries` row with status `new`, and (b) emails
the admin notify list via Resend, with **reply-to set to the applicant's
address** so admins can just hit Reply to start the vetting thread. The visitor
then sees a warm confirmation — "a couple of us will read this and email you
back soon" — with **no login and no magic link.** Nothing about the member area
is exposed.

### 2. Admin notification & vetting

- Recipients come from a configurable `ADMIN_NOTIFY_EMAILS` env var (comma-
  separated), independent of the database so it works from day one. Default:
  group admins.
- Vetting happens over ordinary email, off-platform, exactly as intended.
- The admin view (Step 7) lists inquiries and drives the funnel:
  `new → reviewing → invited → joined`, or `declined`.

### 3. Invitation — the "yes" path

From the admin inquiry view, an **Invite** action on an inquiry:

- creates the Supabase auth user (`inviteUserByEmail`) and a profile marked
  `approved`;
- sends a **branded Peace Circle invite email** (custom Resend template) with a
  one-click link;
- marks the inquiry `invited`.

The link lands on `/welcome`, auto-authenticates via the invite token, and shows
a short finish step (confirm display name, pick an avatar tint) → Member Home.
Because the profile is already `approved`, RLS opens member content immediately.

Invitation is decoupled from the inquiry table, too: an admin can invite an
email that never filled the form (someone the Circle already knows) from the
same Invite form.

### 4. Launch onboarding — shared code

For getting the existing group in on day one:

- A single **launch code** (e.g. `PEACE-2026`) with a configurable **expiry**
  and an optional **max-redemptions** cap, to bound the blast radius if it's
  forwarded.
- Distributed to the group directly (read at a meeting, sent in a group email).
- Redemption: `/welcome?code=PEACE-2026` → enter name + email → magic link → on
  click, a profile is created `approved` → Member Home.
- Let the code expire after the launch window; from then on, new people go
  through the interest-form → invite path. Redemptions are visible in the admin
  view so a leaked code is noticeable.

### Route changes still to make

- `/join` — becomes the **interest form** (currently simulates instant signup);
  ends at "we'll be in touch," no auth.
- `/signin` — existing members, magic link. Conceptually unchanged.
- `/welcome` — **new**: unified onboarding landing for both invite links
  (per-person token) and the launch code, including "finish your profile."
- `/pending` — becomes the gentle "you signed in but you're not on the roster
  yet — here's the interest form" screen.

---

## Data model

The schema is defined in `supabase/migrations/`, which is the authoritative
reference — enums, per-kind `CHECK` constraints, the FTS column, RLS policies,
and the admin bootstrap trigger all live there with commentary. The map:

| Table          | Purpose                                                         |
| -------------- | --------------------------------------------------------------- |
| `profiles`     | The row every RLS policy checks. Approved at creation.          |
| `admin_emails` | Bootstrap allowlist; listed addresses become admins on sign-in. |
| `inquiries`    | Public interest-form submissions. Anon-insertable, admin-read.  |
| `launch_codes` | Shared onboarding codes for the launch cohort.                  |
| `resources`    | The Library shares: `quote`, `link`, `picture`, `book`.         |
| `comments`     | Threads on a resource.                                          |
| `messages`     | The Circle group chat; cursor-paginated.                        |
| `events`       | Admin-managed gatherings; feeds calendar, upcoming, and detail. |

Three notes that aren't obvious from the SQL alone:

- **Gatherings are not a resource kind.** Members share quotes, links, pictures,
  and books; scheduling a gathering is an admin action against `events`.
- **There is no self-serve `pending` state.** A profile exists only once someone
  is invited or redeems a launch code, and is `approved` at creation. Someone
  turned away during vetting never gets a profile; their _inquiry_ is declined.
- **Removing a member means revoking, not deleting.** `author_id` cascades from
  `resources`, `comments`, and `messages`, so deleting a profile would erase
  everything that person ever contributed from everyone else's history. Setting
  `profiles.status = 'revoked'` closes all eight tables at once — every member
  policy routes through `is_approved()` — while leaving their words in place.

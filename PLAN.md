# Peace Circle — Implementation Plan

A web app for the Peace Circle community group: a place for approved members to
share resources (quotes, links, pictures), discuss them, and track upcoming events.

This document covers the full arc from the design-feedback stage through launch,
including the interactive prototype used to gather feedback on multiple design options.

---

## Feature summary

- **Public landing page** — hero statement + call to action for new visitors.
- **Passwordless auth** — magic link via email; no passwords, ever.
- **Interest form** — new visitors submit an inquiry (how they heard, who referred them); a couple of admins are emailed and vet by reply.
- **Invite / launch-code gate** — member access is granted by an admin invite or a shared launch code, never by self-service sign-up. Enforced in RLS.
- **Member Home** — a dashboard landing: greeting, this-month calendar, upcoming gatherings, recently shared, and The Circle chat.
- **The Circle group chat** — a group-text feed for the whole circle, with cursor-paginated history (realtime updates deferred past Phase 2).
- **Library of shares** — quotes, links, pictures, and books the circle passes along; newest first.
- **Searchable library** — full-text search over past shares.
- **Commentable shares** — comment threads; no likes or reactions.
- **Events calendar** — upcoming gatherings, admin-managed.

---

## Recommended stack

- **Next.js (App Router)** front end, styled with **Tailwind**.
- **Supabase** backend: Auth (magic links), Postgres (data + full-text search), Storage (images), Row-Level Security (the approval gate).
- **Resend** (or similar) for transactional email / magic-link delivery.
- **Vercel** for production hosting.

### Why this stack

Supabase covers auth, database, search, and file storage in one service, so there's
nothing extra to bolt on. A monthly-meeting community group fits comfortably inside
the Supabase **free tier** ($0; ~500 MB database, ~1 GB file storage, magic-link auth)
and will not need the paid tier (Pro, $25/mo — over budget). Net monthly cost is
effectively $0 in services plus ~$10–15/year for a domain.

### Free-tier gotchas to design around

1. **Supabase pauses free projects after ~7 days of inactivity.** For a group that's
   quiet between monthly meetings, the first visitor after a quiet stretch could hit a
   sleeping database. **Fix:** a free weekly cron (GitHub Action pinging an endpoint)
   keeps it awake.
2. **No automatic backups on the free tier.** Add a scheduled DB dump (also free via
   GitHub Actions).
3. **Supabase's built-in email sender is rate-limited** (a handful per hour; meant for
   testing). Wire in a real SMTP provider (e.g., Resend's free tier, ~3,000 emails/mo)
   **before** testing magic-link login, or the links will silently throttle.

### Hosting note

**Decision (superseding earlier drafts): production runs on Vercel.** Vercel is the
smoothest Next.js host — zero-config for App Router, Server Actions, ISR, and image
optimization, all of which this app uses — and preview deploys per branch make the
feedback rounds easy.

The one caveat to stay aware of: Vercel's free Hobby plan restricts use to
**personal, non-commercial** projects, and Pro is $20/user/mo. The Peace Circle is an
unincorporated community group with no revenue, which reads as non-commercial, but it
is a judgment call rather than a bright line. If Vercel ever pushes back, the app is a
plain Node.js Next.js server (`next build` / `next start`) with no Vercel-only APIs, so
moving to another host is a redeploy, not a rewrite. **Keep it that way** — avoid
Vercel-proprietary primitives so the exit stays cheap.

---

## Prototype philosophy: evolve it, don't throw it away

Build the prototype in the **same stack you'll ship** (Next.js + Tailwind), as a
**front-end-only version with mock data**, then progressively wire in the real backend.
This is neither "fully functional" nor "throwaway" — it's a UI shell you keep and a data
layer you swap.

- Claude Design outputs are HTML/React/Tailwind and drop almost directly into components.
- All layout, styling, and navigation carry into production.
- The only throwaway pieces are mock data and a stubbed login — small and bounded.

### The key architectural seam: a thin data-access layer

Put **all** data behind functions like `getPosts()`, `getEvents()`,
`getComments(postId)`. In the prototype these return hardcoded arrays; in production you
change only their insides to call Supabase. Components never know the difference. This
single seam turns "evolve the prototype" into a half-day swap instead of a rewrite.

Keep the first interactive version deliberately shallow: stub the login as a button that
flips into the member view — no real auth, no database, no RLS — so the page structure
can change cheaply based on Gail's feedback before any backend exists.

---

## Multiple design options in the prototype

The prototype must let Gail view and compare several distinct design options and click
through a full set of pages within each one. Use **route segments** to identify the
active design, with a persistent switcher in the header.

> **As built:** the design options are **Option A–D**, encoded in a single
> dynamic `[variant]` segment (`/option-a/…`), not the `d1`/`d2`/per-design
> folders sketched below. Each option is the *same* app themed differently — the
> active key drives `data-variant` on the app root, which selects a token set +
> per-variant treatment overrides — rather than structurally distinct component
> sets. The illustrative `app/d1/…` tree and `designs/registry.ts` below are the
> original sketch; the realized layout is `app/[variant]/{home,library,meetings,
> about,join,signin,pending,admin}`. Member pages are **Home, Library, and
> Meetings**, not `feed / post/[id] / calendar`; a share opens in an in-page
> **drawer**, so there are no per-resource URLs (`/post/[id]`) yet.

### Approach

Because the options came out of Claude Design as separate, structurally distinct designs,
use **variant component sets**: each design has its own version of each page, and the
active route segment selects which set renders. (A pure restyle — same structure,
different tokens — would be a simpler subset of this; the variant approach handles both.)

```
app/
  d1/
    feed/page.tsx        -> renders Design1.Feed
    library/page.tsx
    calendar/page.tsx
    post/[id]/page.tsx
  d2/
    feed/page.tsx        -> renders Design2.Feed
    ...
```

Keep a registry and resolve the active design's pages from the route segment:

```tsx
// designs/registry.ts
import * as Design1 from "./design1";
import * as Design2 from "./design2";

export const DESIGNS = {
  d1: { label: "Design 1", pages: Design1 },
  d2: { label: "Design 2", pages: Design2 },
};
```

```tsx
// app/[design]/feed/page.tsx  (or per-segment, whichever you prefer)
function FeedPage({ params }) {
  const Feed = DESIGNS[params.design].pages.Feed;
  return <Feed />;
}
```

### Why route segments (vs. context alone)

Encoding the active design in the URL (`/d2/feed`) buys two things that matter for a
feedback round:

1. **Survives refresh** — context alone resets on reload.
2. **Stable, shareable links** — you can point Gail straight at "the calendar in
   design 2" (`/d2/calendar`), and she can bookmark a favorite.

You can still layer a small React context on top for clean component access, kept in
**sync with the URL as the source of truth**. The switcher buttons rewrite only the
design segment while preserving the rest of the path (so switching from `/d2/calendar`
to design 1 lands on `/d1/calendar`, not back at the feed).

### Make the switcher obviously a scaffold

Style the switcher bar so it reads as a **prototype tool, not a product feature** — a
thin strip labeled something like "Prototype — viewing Design 2." Otherwise Gail may
assume the design-switcher is part of the real site and give feedback on it.

---

## Phased plan

### Phase 0 — Scaffold (once designs are locked) — ✅ done

Create the Next.js app, add Tailwind and a component library. Set up
the route structure for every page (landing, sign-up, pending-approval, feed, post
detail, library/search, calendar, admin) and the `d1` / `d2` / … design segments.

### Phase 1 — Interactive prototype — ✅ done (Option A chosen)

Translate the round-2 designs into components for each design variant. Wire navigation so
Gail can click between every page within a design, plus the header switcher to move
between designs. Feed all pages from the mock data layer. Add the stub login toggle.
Deploy a preview link and send it to her. This is the artifact she reviews.

### Phase 2 — Backend foundation

Spin up the Supabase project. Define the schema (below). Enable RLS and write the
approval-enforcing policies. Configure magic-link auth with Resend SMTP. Build the
interest-form → inquiry-email flow and the invite / launch-code onboarding path (see
**Member sign-up & onboarding**). Replace the insides of the data-access functions with
Supabase queries — the prototype UI should light up with little change.

> Note: the multi-design route structure is a prototype-only affordance. **Decision
> (updated): Gail chose Option A, so the collapse happens *before* Phase 2**, not
> after. The earlier decision to carry all four options through Phase 2 assumed her
> feedback was still outstanding; now that it isn't, collapsing first means every
> backend change lands in one set of components instead of being reasoned about
> against four themes. See **Remaining work → Step 1**.

### Phase 3 — Core features

Posting (quote / link / image, with uploads to Storage); comment threads; full-text
search for the library; events calendar (a library like `react-big-calendar` or
FullCalendar saves time over a hand-rolled month grid).

### Phase 4 — Admin & polish

Gail's approval queue; basic moderation (delete a post/comment); event management; empty
states, error handling, mobile layout. Optional "you've been approved" email via Resend.

### Phase 5 — Launch

Point the domain; verify the SMTP sending domain; seed starter content so the feed isn't
empty on day one; set up the keep-alive cron and backup job; onboard members.

---

## Where things stand (audit, August 2026)

Phases 0 and 1 are complete and the tree typechecks and lints clean. What exists:

- **Routes** — `app/[variant]/{,home,library,meetings,about,join,signin,pending,admin}`,
  prerendered for all four options via `generateStaticParams`.
- **Real, working UI** — Home (greeting, month calendar, upcoming, recently shared,
  The Circle chat with cursor pagination), Library (filter bar, resource cards, detail
  drawer, composer), Meetings, the landing pages, and the simulated auth flow.
- **Placeholders only** — `/about`, `/pending`, `/admin` render `PlaceholderPage`.
- **The data seam holds.** `lib/data/index.ts` is exactly the architecture the plan
  called for: every page reads through `getResources()`, `getMessages()`, etc., and no
  component knows where data comes from. This is the single best thing about the
  current state — Phase 2 really is a body-swap of these functions.
- **One real server action** — `app/actions/messages.ts` (`loadOlderMessages`).

### What is *not* real yet

- **Auth is a localStorage stub** (`components/session.tsx`). The member-area gate is a
  client-side `useEffect` → `router.replace("/join")` in `home-view.tsx` and
  `library-view.tsx`. That is a UI curtain, not a gate — view-source reveals everything.
- **All mutations are client state.** Composing a share, adding a comment, and sending
  a chat message update React state and vanish on reload.
- **No uploads.** Picture resources carry a `placeholder` string; the composer's
  drop zone is decorative.
- **No search.** The Library filters by kind in memory; there is no text search at all,
  though it is in the feature list.
- **No database, no Supabase project, no email.**

### Discrepancies to settle while doing the work

1. **The `event` resource kind.** `lib/data/types.ts` defines `EventResource` and the
   composer offers an "event" option, but the data model above says the
   member-composable `event` kind is **dropped** in favour of the admin-managed
   `events` table. Resolve by removing it from `COMPOSE_KINDS`, `types.ts`, and the
   mock seed — gatherings are scheduled by admins, not posted by members.
2. **Times are pre-formatted strings.** `Message.day` / `Message.when`,
   `Resource.when`, `Comment.when`, and `Meeting.{month,day,time}` are display labels
   ("Yesterday", "4:12 PM", "just now") rather than timestamps. Postgres returns
   `timestamptz`, so **Step 5 must move formatting out of the seed and into the UI**.
   This is the largest single piece of Phase 2 churn and it is easy to underestimate.
3. **`NextMeeting` is a denormalized blob** (`expect[]`, `goodToKnow{}`) while the plan
   has one `events` table feeding calendar, upcoming, and next-gathering detail. Derive
   `NextMeeting` from the next `events` row rather than storing it separately.
4. **The `"you"` sentinel.** `authorId: "you"` in the composer and mock data stands in
   for the signed-in member; it becomes a real `profiles.id`.
5. **`Member.tint` vs `profiles.avatar_tint`** — same field, two names. Pick one.
6. **README is still create-next-app boilerplate.**

---

## Remaining work

Nine steps, ordered so each one rests on the last. Steps 1–4 are the risky part; after
that the app is mostly filling in features behind a working gate.

### Step 1 — Collapse to Option A

Do this **first**. It is the cheapest it will ever be, and it halves the surface every
later step touches.

Sizing it: there are 88 `option-X:` utility overrides in the tree, but only **4** are
`option-a:` — Option A is essentially the base design and B/C/D are the overrides. So
this is mostly deletion, not rework.

- Flatten `app/[variant]/*` up to `app/*`; delete `app/page.tsx`'s redirect.
- Delete `components/prototype-bar.tsx`, `components/variant-context.tsx`,
  `lib/variants.ts`, and the three unused heroes (`option-{b,c,d}-hero.tsx`).
- Strip the 84 `option-{b,c,d}:` utilities; fold the 4 `option-a:` ones into their
  base class strings.
- In `app/globals.css`, keep the `[data-variant="option-a"]` token block as plain
  `:root`, delete the other three and all four `@custom-variant` lines.
- Replace `variantPath(variant, "/x")` calls with plain `"/x"` hrefs.
- Prune now-unused Google fonts from `app/layout.tsx` — six families load today and
  Option A uses a fraction of them. Free performance win.

**Verify:** `npx tsc --noEmit && npm run lint`, then click every route.

### Step 2 — Supabase project + schema

- Create the project; save `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  and a server-only `SUPABASE_SERVICE_ROLE_KEY`.
- Write the schema from **Data model** as SQL migrations under `supabase/migrations/`,
  version-controlled — not clicked into the dashboard, or the schema becomes
  unreproducible.
- Tables: `profiles`, `inquiries`, `launch_codes`, `resources`, `comments`, `messages`,
  `events`. Enums for `resource_kind` and `inquiry_status`; per-kind `CHECK`
  constraints; a generated `search` tsvector on `resources` with a GIN index; a
  `created_at` index on `messages` for cursor pagination.
- **Enable RLS on every table**, then write the policies. Default-deny, and every
  member-facing policy keyed on `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
  AND status = 'approved')`. `inquiries` gets an anon-INSERT-only policy and
  admin-only SELECT.
- Seed the current mock content so the app is not empty on first connect.

**Verify before moving on:** with an anon key and no session, every member table
returns zero rows. Test this explicitly — it is the whole security model.

### Step 3 — Real auth (replaces the stub)

⚠️ **Next.js 16 gotcha:** Supabase's published SSR guide says `middleware.ts`. In
Next 16 that file is **`proxy.ts`**, exporting a function named `proxy`, and the
`edge` runtime is *not* supported there — proxy is Node.js-only and not configurable.
Copying the Supabase docs verbatim will not work.

- Add `@supabase/ssr`; create `lib/supabase/{client,server}.ts` for the browser and
  server (cookie-backed) clients.
- Add `proxy.ts` at the repo root for session refresh, per the note above.
- **Wire Resend as the SMTP provider *before* testing magic links** — Supabase's
  built-in sender is rate-limited to a handful per hour and will silently throttle.
- Add `app/auth/callback/route.ts` to exchange the code for a session.
- Build `lib/dal.ts`: `verifySession()` and `requireApproved()`, both wrapped in React
  `cache()`, with `import "server-only"` at the top. This is the pattern the bundled
  Next.js 16 auth guide prescribes.
- **Delete `components/session.tsx`** and the `useEffect` redirects in `home-view.tsx`
  and `library-view.tsx`. Member pages become server components that call
  `requireApproved()` and `redirect()` before rendering anything. The gate moves from
  the client to the server *and* the database.
- `/pending` becomes the real "you're signed in but not on the roster" screen.

### Step 4 — Onboarding paths

- Rewrite `/join` as the **interest form** (it currently simulates instant signup):
  honeypot field, per-IP rate limit, insert an `inquiries` row, email
  `ADMIN_NOTIFY_EMAILS` via Resend with **reply-to set to the applicant**, then show
  the warm confirmation. No auth, no magic link.
- Add `/welcome` handling both the per-person invite token and `?code=` launch-code
  redemption, ending in the short finish-profile step.
- Launch-code redemption must check `expires_at` and `max_uses` and increment `uses`
  **atomically** — do it in a Postgres function, not in application code, or two
  simultaneous redemptions can both pass the cap check.

### Step 5 — Swap the data seam

The half-day this document promised, plus the timestamp churn from discrepancy #2.

- Replace the bodies of the `lib/data/index.ts` functions with Supabase queries. Every
  one goes through the DAL first.
- `getMessages()`'s cursor changes from a message id to a `created_at` timestamp:
  `.lt("created_at", before).order("created_at", { ascending: false }).limit(n)`, then
  reverse for display.
- Convert `when` / `day` / `time` fields to real timestamps and move formatting into
  the components.
- Delete `lib/data/mock.ts` once nothing imports it.

### Step 6 — Real writes

Server actions for composing a share, adding a comment, and sending a chat message,
replacing the client-state mutations in `composer.tsx`, `resource-detail.tsx`, and
`circle-chat.tsx`.

⚠️ **Next.js 16 caching APIs changed** — do not use remembered patterns:

- `revalidateTag(tag)` now requires a second argument: `revalidateTag(tag, "max")`.
  The one-argument form is a TypeScript error.
- Prefer **`updateTag(tag)`** in server actions — it expires and refreshes in the same
  request, giving read-your-writes semantics, which is what every one of these
  mutations wants (the member should see their own post immediately).
- **`refresh()`** refreshes the client router from inside a server action.

Keep optimistic UI on the chat send so it stays feeling like a group text.

### Step 7 — Search, uploads, calendar (Phase 3)

- Full-text search over `resources.search`, wired into the Library's existing filter bar.
- Real image uploads to Supabase Storage; replace `PictureResource.placeholder` with
  `image_path` and render via `next/image`. Note Next 16 changed `next/image` defaults
  (`minimumCacheTTL`, `imageSizes`, `qualities`, and local images with query strings).
- Point the Meetings page and Home calendar at the real `events` table.

### Step 8 — Admin & polish (Phase 4)

Replace the `/admin` placeholder with the inquiry queue (`new → reviewing → invited →
joined` / `declined`), the Invite action (`inviteUserByEmail` + branded Resend
template), moderation (delete a share/comment), and event management. Then empty
states, error boundaries, and a mobile pass.

Also write the `/about` page, which is still a placeholder.

### Step 9 — Launch (Phase 5)

Point the domain, verify the Resend sending domain, generate the launch code and set
its expiry, seed starter content, and onboard the cohort.

**Free-tier chores that are now back in scope**, since production is Supabase-on-Vercel
rather than a managed backend host:

- **Keep-alive.** Supabase pauses free projects after ~7 days idle, and this group is
  quiet between monthly meetings. A weekly GitHub Action pinging a health endpoint
  avoids the first-visitor-hits-a-sleeping-database problem.
- **Backups.** The free tier has none. Add a scheduled `pg_dump` via GitHub Actions.

### Testing — a gap worth closing

There are no tests. Given the security model, the highest-value ones are cheap: a
handful of integration tests asserting that an un-approved session reads **nothing**
from each member table, run against a local Supabase instance. Add them in Step 2 while
the policies are fresh, not at the end. Next.js ships testing guides for Vitest and
Playwright in `node_modules/next/dist/docs/01-app/02-guides/testing/`.

---

## Member sign-up & onboarding

Sign-up is deliberately *not* self-service. The Peace Circle is a small, personal
group, so joining runs through a human vetting conversation. The public form is an
**inquiry**, not an account; access is created only afterward, by an admin invite
or a shared launch code.

### Two layers, kept separate

- **Authentication** (magic link, passwordless) only proves you own an email
  address. Anyone can request one.
- **Authorization** (seeing member content) requires an **approved profile**, and
  is enforced in RLS. Signing in with a magic link, by itself, grants nothing.

So a stranger who guesses their way to `/signin` can authenticate but lands on a
"you're not on the roster yet" screen — the database, not the UI, keeps them out.
This is the same non-negotiable RLS principle stated below, applied to the gate.

### Three entry points, one end state

All three converge on an authenticated member with an `approved` profile:

1. **Interest form** (strangers) → vetting over email → admin invite.
2. **Invite link** (post-vetting, per person) → approved profile.
3. **Launch code** (the existing cohort at launch) → approved profile.

### 1. Public interest form (`/join`)

Replaces the current instant-signup `/join`. Fields:

- Name (required)
- Email (required)
- "How did you hear about the Peace Circle?" (required)
- "Were you referred by a current member? If so, who?" (optional)
- "Anything you'd like us to know?" (optional)
- A hidden honeypot field + a light per-IP rate limit for spam.

On submit it (a) inserts an `inquiries` row with status `new`, and (b) emails the
admin notify list via Resend, with **reply-to set to the applicant's address** so
admins can just hit Reply to start the vetting thread. The visitor then sees a warm
confirmation — "a couple of us will read this and email you back soon" — with **no
login and no magic link.** Nothing about the member area is exposed.

### 2. Admin notification & vetting

- Recipients come from a configurable `ADMIN_NOTIFY_EMAILS` env var (comma-
  separated), independent of the database so it works from day one before any
  profiles exist. Default: Gail plus one or two others.
- Vetting happens over ordinary email, off-platform, exactly as intended.
- A minimal admin view (Phase 4) lists inquiries and drives the funnel:
  `new → reviewing → invited → joined`, or `declined`.

### 3. Invitation — the "yes" path

From the admin inquiry view, an **Invite** action on an inquiry:

- creates the Supabase auth user (`inviteUserByEmail`) and a profile marked
  `approved`;
- sends a **branded Peace Circle invite email** (custom Resend template) with a
  one-click link;
- marks the inquiry `invited`.

The link lands on `/welcome`, auto-authenticates via the invite token, and shows a
short finish step (confirm display name, pick an avatar tint) → Member Home. Because
the profile is already `approved`, RLS opens member content immediately.

Invitation is decoupled from the inquiry table, too: an admin can invite an email
that never filled the form (someone Gail already knows) from the same Invite form.

### 4. Launch onboarding — shared code

For getting the existing group in on day one:

- A single **launch code** (e.g. `PEACE-2026`) with a configurable **expiry** and
  an optional **max-redemptions** cap, to bound the blast radius if it's forwarded.
- Distributed to the group directly (read at a meeting, sent in a group email).
- Redemption: `/welcome?code=PEACE-2026` → enter name + email → magic link → on
  click, a profile is created `approved` → Member Home.
- Let the code expire after the launch window; from then on, new people go through
  the interest-form → invite path. Redemptions are visible in the admin view so a
  leaked code is noticeable.

### Route changes (vs. the current prototype)

- `/join` — now the **interest form** (was instant signup); ends at "we'll be in
  touch," no auth.
- `/signin` — existing members, magic link. Conceptually unchanged.
- `/welcome` — **new**: unified onboarding landing for both invite links (per-person
  token) and the launch code (shared code), including the "finish your profile" step.
- `/pending` — repurposed as the gentle "you signed in but you're not on the roster
  yet — here's the interest form" screen (defense in depth for un-approved sign-ins).

### Data-model deltas (feed into the Phase 2 schema)

- **New `inquiries` table** — `name`, `email`, `heard_from`, `referred_by`,
  `message`, `status` (`new`/`reviewing`/`invited`/`joined`/`declined`),
  `created_at`, `handled_by`, `notes`. Anon may **insert** (public form) under a
  tight policy; only admins may read. Never gated as member content.
- **`profiles.status`** simplifies to `approved` (plus optional `declined`): the
  self-serve `pending` state disappears, since no one self-creates an account. A
  profile exists only once invited or code-redeemed, and is `approved` at creation.
- **New `launch_codes` table** — `code`, `expires_at`, `max_uses`, `uses`,
  `created_by`. (Per-person invites ride Supabase's native, single-use, expiring
  invite tokens; this table backs the shared launch code and any future shared code.)

### Phase mapping

- **Phase 2** — interest form + `inquiries` table + admin notification email;
  magic-link auth; RLS gate on `approved`; `/welcome` onboarding; launch-code
  redemption.
- **Phase 4** — admin inquiry list + Invite action + branded invite-email template.
- **Phase 5 (launch)** — generate the launch code, set its expiry, distribute it to
  the cohort.

---

## Data model (anchors Phase 2)

The realized model is richer than the original sketch; the detailed schema (enums,
per-kind `CHECK`s, FTS column, RLS policies, bootstrap trigger) lives in the Phase 2
implementation plan. Summary:

- **`profiles`** — links to the auth user; holds `name`, `role`, `status`
  (`approved`, plus optional `declined`), `is_admin`, and `avatar_tint`. A row exists
  only once someone is invited or redeems the launch code, and is `approved` at
  creation — there is no self-serve `pending` state (see **Member sign-up &
  onboarding**). This row is what RLS policies check.
- **`inquiries`** — public interest-form submissions awaiting vetting. `name`,
  `email`, `heard_from`, `referred_by`, `message`, `status`
  (`new` / `reviewing` / `invited` / `joined` / `declined`), `created_at`,
  `handled_by`, `notes`. Anon-insertable, admin-readable; not member content.
- **`launch_codes`** — shared onboarding codes for the launch cohort. `code`,
  `expires_at`, `max_uses`, `uses`, `created_by`.
- **`resources`** — the Library shares. `author_id`, `kind`
  (`quote` / `link` / `picture` / `book`), `title`, `body`, plus kind-specific
  columns (`quote`/`attribution`, `url`, `book_author`, `image_path`), `created_at`,
  and a generated `search` tsvector. (`image`→`picture`; `book` added; `text` and the
  member-composable `event` kind are dropped.)
- **`comments`** — `resource_id`, `author_id`, `body`, `created_at`.
- **`messages`** — The Circle group chat. `author_id`, `body`, `created_at`;
  cursor-paginated on `created_at`.
- **`events`** — admin-managed; one table unifies the calendar, the upcoming list,
  and the next-gathering detail. `title`, `note`, `description`, `location`,
  `starts_at`, `ends_at`, `agenda[]`, `address`/`parking`/`welcome`, `created_by`.

---

## Security principle (non-negotiable)

The access gate must live in **RLS policies** keyed on an `approved` profile, not just
the front end. Anyone can request a magic link and sign in, but a user **without** an
approved profile must be able to read or write **nothing** member-facing — the database
itself enforces this, so a hidden UI element or a poked API call can't leak the feed.
The public `inquiries` insert is the one anon-writable path, and it is write-only.

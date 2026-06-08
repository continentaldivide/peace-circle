# Peace Circle — Implementation Plan

A web app for the Peace Circle community group: a place for approved members to
share resources (quotes, links, pictures), discuss them, and track upcoming events.

This document covers the full arc from the design-feedback stage through launch,
including the interactive prototype used to gather feedback on multiple design options.

---

## Feature summary

- **Public landing page** — hero statement + call to action for new visitors.
- **Passwordless sign-up** — magic link via email.
- **Approval gate** — new members must be approved by Gail before they can see member content.
- **Member feed** — newest posts/resources first.
- **Searchable library** — full-text search over past posts.
- **Commentable posts** — comment threads; no likes or reactions.
- **Events calendar** — upcoming events.

---

## Recommended stack

- **Next.js (App Router)** front end, styled with **Tailwind**.
- **Supabase** backend: Auth (magic links), Postgres (data + full-text search), Storage (images), Row-Level Security (the approval gate).
- **Resend** (or similar) for transactional email / magic-link delivery.
- **Netlify or Cloudflare Pages** for production hosting.

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

Vercel is the smoothest Next.js host, but its free Hobby plan restricts use to
**personal, non-commercial** projects, and Pro is $20/user/mo (the entire budget for
one service). A community-group site sits in a gray area on those terms. Prefer a free
host that clearly permits org/non-personal use (**Netlify** or **Cloudflare Pages**)
for production. Vercel **preview deploys are fine for the prototype**.

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

### Phase 0 — Scaffold (once designs are locked)

Create the Next.js app, add Tailwind and a component library. Set up
the route structure for every page (landing, sign-up, pending-approval, feed, post
detail, library/search, calendar, admin) and the `d1` / `d2` / … design segments.

### Phase 1 — Interactive prototype (immediate next deliverable)

Translate the round-2 designs into components for each design variant. Wire navigation so
Gail can click between every page within a design, plus the header switcher to move
between designs. Feed all pages from the mock data layer. Add the stub login toggle.
Deploy a preview link and send it to her. This is the artifact she reviews.

### Phase 2 — Backend foundation

Spin up the Supabase project. Define the schema (below). Enable RLS and write the
approval-enforcing policies. Configure magic-link auth with Resend SMTP. Build the real
sign-up → pending → approved flow. Replace the insides of the data-access functions with
Supabase queries — the prototype UI should light up with little change.

> Note: once a real backend exists, collapse the design variants down to the chosen
> design (or keep one as the canonical set). The multi-design route structure is a
> prototype-only affordance.

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

## Data model (anchors Phase 2)

- **`profiles`** — links to the auth user; holds `status` (`pending` / `approved`) and
  `is_admin`. This row is what RLS policies check.
- **`posts`** — `author_id`, `type` (quote / link / image / text), `body`, `url`,
  `image_path`, `created_at`.
- **`comments`** — `post_id`, `author_id`, `body`, `created_at`.
- **`events`** — `title`, `description`, `location`, `starts_at`, `ends_at`,
  `created_by`.

---

## Security principle (non-negotiable)

The approval gate must live in **RLS policies** keyed on `profiles.status = 'approved'`,
not just the front end. A pending or rejected user can sign in but must be able to read
or write **nothing** member-facing — the database itself enforces this, so a hidden UI
element or a poked API call can't leak the feed.

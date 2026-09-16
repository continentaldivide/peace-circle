# Peace Circle — Implementation Plan

A web app for the Peace Circle community group: a place for approved members to
share resources (quotes, links, pictures, books), discuss them, and track
upcoming gatherings.

The UI is built, the database schema is in place, the access gate is real, every
page both reads and writes real data, the Library is searchable, and pictures
are real files. What remains is admin tools and launch. This document is the
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
- **Events calendar** — upcoming gatherings on member Home, admin-managed.

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
and never learn where the data came from. When they moved from mock arrays to
Supabase queries in Step 4, only their insides and the timestamp fields changed.

Writes are not routed through that module — each server action inserts its own
row, because a write also owns a gate check, validation, and what the member is
told when it fails. The seam's real content is kept, though: the column names
still live only in `lib/data/rows.ts`, which maps rows out (`toResource`) and
drafts in (`toResourceInsert`), so no component and no action spells one out.

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

Steps 1–6 are done: there is a hosted Supabase project with the schema pushed,
the access gate is real, both ways into the circle work, every member page reads
and writes real data, and the Library both searches and holds photographs.
Member pages are server components that call `requireApproved()` before
rendering, backed by RLS.

Onboarding is complete end to end, verified in a browser against the local
stack rather than reasoned about:

- **`/join` is the interest form.** No auth, no magic link — it inserts an
  `inquiries` row and emails the admin notify list with reply-to set to the
  applicant.
- **`/welcome` handles both ways in.** `?code=` collects a name and email,
  sends a magic link that carries the code back through the callback's `next`
  parameter, redeems it, and ends on the finish-profile step. An invite link
  lands on `/auth/confirm`, which turns its token hash into a session and
  joins the same finish step.
- **Redemption is atomic and lives in the database.** `redeem_launch_code()`
  locks the code row before it checks the expiry or the cap, so two people
  redeeming the last seat at the same moment cannot both pass. It is
  `security definer` because `launch_codes` is admin-only and `profiles` has
  no insert policy at all — which is also why nothing yet needs the
  service-role key. Step 7's invites will be the first thing that does.

The data seam is real (Step 4). `lib/data/index.ts` queries `profiles`,
`resources` with their `comments`, `messages`, and `events`, each after
`requireApproved()`; `lib/data/mock.ts` is gone. Things worth knowing:

- **The circle's timezone is US Eastern, `America/New_York`.** Every date and
  time is formatted by `lib/time.ts` in that zone, never the runtime's. A
  server in UTC and a browser elsewhere would otherwise disagree about times
  and about "today", which is wrong and fails hydration. Timestamps cross the
  seam as ISO strings; `CircleEvent.date` is the one calendar date, already in
  that zone.
- **Chat history pages by `(created_at, id)`.** A timestamp-only cursor skips
  messages that share a timestamp at a page boundary.
- **`/meetings` is gone,** with nothing in its place. Home's calendar and
  Upcoming list are the only views of `events`. The columns only that page
  used (`agenda`, `address`, `parking`, `welcome`, `description`, `location`)
  stay in the schema for Step 7's event management.

Every mutation is real (Step 5). Composing a share, commenting on one, and
sending a chat message each go through a server action in `app/actions/`, which
checks `requireApproved()` for itself, takes the author from the session, and
re-runs the rules the form ran — a rendered form is not a security boundary,
because anyone can POST to an action without loading the page. Things worth
knowing:

- **`refresh()`, not `updateTag()`.** Cache Components is off and nothing is
  tagged, so no cache entry exists to expire; what goes stale is the RSC
  payload the browser holds. `refresh()` re-renders the current route and
  returns it in the same response as the action's result.
- **The server owns the Library.** `HomeView` and `LibraryView` render the
  `resources` prop rather than a copy in state. That is what makes `refresh()`
  work at all: a list seeded once from props would ignore the re-render.
- **The chat is the exception, deliberately.** Its list grows in the browser as
  older pages are paged in, so a re-render cannot replace it. `sendMessage`
  therefore calls no `refresh()` and returns the saved row instead; the message
  is drawn with a `pending:` id and that row takes its place. Replacing rather
  than appending is what keeps one message from showing twice.
- **A failed action is caught at the call site.** An error thrown out of an
  async transition goes to the nearest error boundary, and there is none until
  Step 7 — so a 500 on one comment would take the whole page down. Each caller
  catches, gives the words back, and says what happened.
- **Writes map columns in `lib/data/rows.ts`, like reads.** `toResourceInsert`
  is the write half of `toResource`, so which columns a kind fills is named in
  one place for both directions.
- **A shared web address is normalised** (`lib/resources.ts`): a missing scheme
  becomes `https://`, as the field's placeholder invites, and anything that is
  not http(s) is refused. The column is plain text, one member writes it and
  another opens it, and `javascript:` is a script rather than an address.

Search and pictures are real (Step 6). Things worth knowing:

- **Search is a URL, not a state variable.** `?q=` is read on the server by
  `app/library/page.tsx` and passed to `getResources({ search })`, so a result
  set is shareable, survives the `refresh()` a new share ends in, and stays
  where the `resources_search_idx` GIN index is. `lib/search.ts` normalises the
  param in one place — an empty or whitespace query means _everything_, not
  nothing.
- **`websearch_to_tsquery`, not the other two.** A person types into this box.
  `to_tsquery` raises a syntax error on a stray dash or apostrophe, so a typo
  would be a 500; `plainto_tsquery` never raises but discards the punctuation,
  so a quoted phrase or a typed "or" would do nothing. `websearch_to_tsquery`
  accepts any input by specification and reads quotes, "or" and a leading dash
  the way every other search box does — which is why the query is passed through
  unescaped.
- **The kind chips stay client-side, and their counts are counts within
  results.** The list handed to `LibraryView` is already what the query matched,
  so "Quotes 2" means two of these. Results stay newest-first rather than ranked:
  the Library is a chronological feed a search narrows, and ranking would need an
  RPC, putting a read outside the seam.

- **The `images` bucket is private.** This is the load-bearing decision. A
  public bucket serves every object at a guessable URL that works for anyone
  holding it, with no session and no policy consulted, which would route the
  circle's photographs around the gate entirely. The policies on
  `storage.objects` (created in the same migration as the bucket, because
  `config.toml` is never pushed) route through the same `is_approved()` /
  `is_admin()` as the other eight tables. Objects are named
  `<author_id>/<uuid>.jpg`, so `storage.foldername(name)[1]` is the uploader and
  "your own file" is something a policy can check.
- **An image URL is a route of this app's:** `/api/images/<path>`, which checks
  the gate and streams the object through the member's own session. One stable
  address per picture, cacheable by the browser. The alternative — a signed URL
  minted per render — is a different string every time, expires while the page
  holding it is still open, and puts a token in the RSC payload.
- **Nothing optimizes these images.** Next's optimizer fetches an image's `src`
  without forwarding the request's headers, so it reaches that route with no
  session and is turned away. Pictures are drawn `unoptimized`, and what takes
  optimization's place is the browser scaling the photo to 1200px and
  re-encoding it as a JPEG _before_ it is uploaded. `next.config.ts` is still
  empty and now says why, including that `dangerouslyAllowLocalIP` is not needed
  and that spelling the local Supabase URL `localhost` would not have sidestepped
  it anyway — the check is a DNS lookup followed by a private-address test.
- **The bytes never pass through a Server Action.** An action's body is capped at
  1 MB. The browser uploads straight to Storage with its own session — which is
  what storage RLS checks — and the action receives a path, which it validates
  for shape and then for ownership, since nothing stops a caller _claiming_ a
  path that is already there.
- **Deleting a share does not delete its object, and cannot be made to.**
  Storage guards its own tables with a trigger that refuses any direct SQL
  delete and says to use the Storage API, so a cascade or a row trigger is not
  available — the gate tests assert this, and the comment on
  `resources.image_path` says it in the schema. **Whoever deletes a share must
  remove its object through the Storage API first.** Step 7's moderation is the
  first thing that will. The composer already does it in the one case that
  exists today: an upload that succeeded followed by an insert that did not.
- **`PictureResource.placeholder` is gone.** It was a restatement of the title,
  so it is derived in `resource-body.tsx` now; the seam carries `image`, which is
  optional. A picture share with no photo is an ordinary share — both pictures in
  the Library are one — and it draws the striped filler it always did.
- **A picture's dimensions are stored** (`image_width`, `image_height`), so
  `next/image` reserves the photo's real shape and nothing below it moves when
  the bytes land. A check constraint keeps all three columns together, and they
  are deliberately not tied to `kind`, because a book cover is the obvious next
  thing to want one.

Three deliberate omissions, so they are not mistaken for oversights:

- **No per-IP rate limit on `/join`.** It would need its own table, since
  serverless instances share no memory, and the honeypot is hardened and the
  form gates client-side. Deferred until spam actually appears rather than
  built against a hypothetical.
- **Neither `/welcome` path has an in-app producer yet.** Nothing creates
  launch codes (Step 8) and nothing sends invites (Step 7), so both are
  driven by hand for now — a `launch_codes` row via psql, an invite through
  the admin API.
- **Nothing is shown when nothing is scheduled.** With no upcoming events,
  Home simply omits its Upcoming section and calendar legend. Designed empty
  states are Step 7.

Still stubbed or missing:

- **Storage does not exist on the hosted project yet.** The bucket and its
  policies are in a migration, so `db push` creates them there; nothing has been
  pushed. Until it is, a hosted upload has nowhere to go.
- **Nothing is emailed from the hosted project yet.** The outgoing seam is
  built (`lib/email.ts`) and `/join` uses it, but without `RESEND_API_KEY` it
  logs instead of sending, and Supabase Auth still uses its own sender — the
  dashboard SMTP switch waits on a verified sending domain. Locally this is
  moot: `supabase start` catches every auth mail in Mailpit.
- **The hosted project is behind the repo.** The four Step 3 migrations _have_
  been pushed. The Step 6 one — the image columns, the `images` bucket and its
  storage policies — has not.
  The hosted invite email template
  also needs setting by hand in the dashboard to point at `/auth/confirm` —
  `config.toml` describes the local stack and is never pushed, so an invite
  sent from the hosted project would otherwise arrive with a link this app
  cannot complete.
- **Placeholder pages** — `/about` and `/admin` render `PlaceholderPage`.

---

## The plan

Eight steps, ordered so each rests on the last. Steps 1–3 are the risky part;
after that it's filling in features behind a working gate. One idea sits past
the end of them, in "After launch" — deliberately not a ninth step, because
nothing in the eight waits on it.

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
  _Built, except the rate limit — deferred, see Status._
- Add `/welcome`, handling both the per-person invite token and `?code=`
  launch-code redemption, ending in the short finish-profile step.
- Launch-code redemption must check `expires_at` and `max_uses` and increment
  `uses` **atomically** — do it in a Postgres function, not in application code,
  or two simultaneous redemptions can both pass the cap check.

### Step 4 — Swap the data seam

_Done._ Replace the bodies of the `lib/data/index.ts` functions with Supabase
queries, each going through the DAL first. Then delete `lib/data/mock.ts`.

Three shape changes made this bigger than it sounds:

- **Times were pre-formatted strings.** `Message.day` / `Message.when`,
  `Resource.when`, `Comment.when`, and `CircleEvent.time` were display labels
  ("Yesterday", "4:12 PM", "just now"). Postgres returns `timestamptz`, so they
  now cross the seam as ISO strings and components format them with
  `lib/time.ts`, always in `America/New_York` (see Status). This was the largest
  single piece of churn and the easiest to underestimate.
- **`getMessages()`'s cursor** changed from a message id to the oldest message's
  `(created_at, id)` pair:
  `created_at < t or (created_at = t and id < id)`, ordered by both descending,
  then reversed for display. The index is `(created_at desc, id desc)` so pages
  stay stable when two messages share a timestamp; a timestamp alone would skip
  them. The cursor round-trips through the browser, so it is validated.
- **Per-kind fields share columns.** A quote's note, a picture's caption, and a
  link's or book's description all live in `resources.body`.

Also: `authorId: "you"` was a sentinel for the signed-in member and is now a
real `profiles.id`; and one mapper (`lib/data/rows.ts`) turns `avatar_tint` into
the `tint` field for both the seam and `getSignedInMember()`.

### Step 5 — Real writes

_Done._ Server actions for composing a share, adding a comment, and sending a
chat message, replacing the client-state mutations in `composer.tsx`,
`resource-detail.tsx`, and `circle-chat.tsx`. See Status for what each one
decided; the short version is that the Library became prop-driven so a
`refresh()` could reach it, and the chat deliberately did not.

> **Next.js 16 caching APIs changed** — don't use remembered patterns:
>
> - `revalidateTag(tag)` now requires a second argument:
>   `revalidateTag(tag, "max")`. The one-argument form is a TypeScript error.
> - **`updateTag(tag)`** expires and refreshes in the same request, which is
>   what a read-your-writes mutation wants — but it needs a tag, and nothing
>   here has one. With Cache Components off, these pages are dynamic and
>   uncached, so `refresh()` (also from `next/cache`, server actions only) is
>   what they actually needed.

The chat keeps its optimistic send, so it stays feeling like a group text.

### Step 6 — Search and uploads

_Done._ Full-text search over the `resources.search` tsvector, wired into the
Library's filter bar as a `?q=` search param read on the server; and real image
uploads to a **private** Supabase Storage bucket, created with its policies in a
migration so they reach the hosted project. See Status for what each decided.

The short version: the query lives in the URL and goes to Postgres through
`getResources()`, while the kind chips stay in the browser; and because the
bucket is private, pictures are served by `/api/images/[...path]` behind the
gate and drawn `unoptimized`, with the scaling done in the browser before upload
instead of by Next afterwards.

> **The `next/image` note that used to be here was half right.** Next 16 did
> change `minimumCacheTTL`, `imageSizes`, `qualities`, `remotePatterns` and
> local images with query strings — and none of it applies, because nothing goes
> through the optimizer. `next.config.ts` is empty on purpose and explains
> itself.

### Step 7 — Admin & polish

- Replace the `/admin` placeholder with the inquiry queue
  (`new → reviewing → invited → joined` / `declined`), the Invite action
  (`inviteUserByEmail` + branded Resend template), moderation (delete a
  share/comment), and event management.
- **Deleting a picture share must remove its object through the Storage API
  before the row.** Nothing in the database can do it — storage refuses a direct
  SQL delete — so a delete that forgets leaves a file in the bucket forever with
  nothing pointing at it. See Status.
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

### After launch — book covers from Google Books

Not part of the eight steps, and not a prerequisite for any of them. A book
share is a title, an author, and a note, and it looks thinner in the Library
than a quote or a picture does. When a member types a title in the composer,
the app could ask the Google Books API what it knows, offer the covers it finds,
and let them pick one.

**This is additive.** A book share with no cover has to keep working exactly as
it does today — the same fields, the same card, the same rules about what may be
posted. Every book already in the Library has no cover and never will unless
someone goes back and edits it, so "no cover" is the normal case, not the
degraded one. If that stops being true while building it, the feature has grown
past what it was for.

Three things are open, and whoever picks this up should settle them first:

- **Where the lookup runs.** It is a suggestion, not a mutation, and Server
  Actions dispatch one at a time per client — so an action fired per keystroke
  would queue behind the member's real writes. The Next.js guide on backends for
  the front end (`02-guides/backend-for-frontend.md`) points at a Route Handler
  for exactly this shape of request. Debouncing is a given either way.
- **What picking a cover stores.** A Google URL is a hotlink: the image is
  served by someone else's host, on their terms, for as long as they choose to.
  Copying it into our own bucket avoids that, but then `image_path` carries two
  different kinds of thing — a photo a member took and a cover we fetched — or
  the schema needs another column, which brings everything in `AGENTS.md` about
  regenerating types with the migration. Whoever builds it will also want what
  Step 6 settled about the bucket: it is private, and an object is reached
  through the app rather than by its own URL. That is the main reason this comes
  after Step 6 rather than beside it.
- **What to verify before building.** The `volumes` endpoint
  (`https://www.googleapis.com/books/v1/volumes?q=intitle:…`) is _said_ to
  answer without a key for light use, rate-limited by IP, with covers under
  `volumeInfo.imageLinks`. None of that has been checked. The current terms of
  use, whether attribution is required, and what the returned URLs actually look
  like — some are `http`, which both `next/image` and a content-security policy
  will object to — are for whoever builds it to confirm against Google's own
  documentation rather than against this paragraph.

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
| `events`       | Admin-managed gatherings; feeds Home's calendar and upcoming.   |

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

import type { NextConfig } from "next";

/**
 * Deliberately empty, which is worth a note because pictures arrived in Step 6
 * and two settings looked like they would be needed.
 *
 * **No `images` block.** Next 16 changed several `next/image` defaults —
 * `minimumCacheTTL` is 4 hours, `qualities` allows only 75, `16` is gone from
 * `imageSizes`, remote images need `remotePatterns`, and images served from a
 * local IP are refused unless `dangerouslyAllowLocalIP` is set. None of it
 * applies: every picture is drawn `unoptimized`, so the optimizer is never
 * asked. It could not do the job anyway — it fetches the `src` without
 * forwarding the request's headers, so it would arrive at `/api/images` with no
 * session and be turned away, which is the same reason this app does not point
 * `next/image` at Supabase Storage directly and set `remotePatterns`. What
 * takes optimization's place is scaling the photo down in the browser before it
 * is ever uploaded; see `lib/images.ts`.
 *
 * (`dangerouslyAllowLocalIP` deserves a sentence of its own, because it is the
 * one that would have bitten locally: the optimizer resolves an image's
 * hostname and refuses any private address, and local Supabase Storage is
 * `127.0.0.1:54321`. Spelling it `localhost` does not help — the check is a DNS
 * lookup followed by a private-IP test, and `localhost` resolves to `127.0.0.1`
 * like anything else. A picture that worked in production would have failed
 * here for that alone.)
 *
 * **No `serverActions.bodySizeLimit`.** A Server Action's request body is
 * capped at 1 MB by default and a photo from a phone is larger, but the photo
 * never travels through an action: the browser uploads it straight to Storage
 * with the session's own JWT — which is what the storage policies check — and
 * the action is handed only the resulting path. Raising the cap would have
 * meant every share's bytes passing through the server for no gain.
 */
const nextConfig: NextConfig = {};

export default nextConfig;

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Session refresh, and nothing else.
 *
 * Next 16 renamed `middleware.ts` to `proxy.ts` (named `proxy` export, Node.js
 * runtime only — setting `runtime` here throws), so Supabase's published SSR
 * guide does not apply verbatim.
 *
 * This deliberately does *not* gate anything. Proxy runs on every request,
 * including prefetches, and the Next.js guide is explicit that it must not be
 * used as an authorization solution or make database calls. The access gate is
 * `requireApproved()` in `lib/dal.ts`, backed by RLS. All this does is give the
 * Supabase client a chance to rotate an expiring token and write it back to the
 * response, so server components downstream see a valid session.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL(),
    SUPABASE_PUBLISHABLE_KEY(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          // The library hands us no-store headers alongside the cookies. They
          // matter: a cached response carrying a Set-Cookie for one member's
          // session would hand that session to the next visitor.
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    },
  );

  // Touching the session is what triggers the refresh above. It must happen
  // before the response is returned, or a rotated token is computed too late to
  // be written and every subsequent request refreshes again.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    /*
     * Every path except:
     * - _next/static, _next/image (build output and optimized images)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - anything with a file extension (fonts, images in public/)
     *
     * Without this, session refresh would run against every CSS and image
     * request too.
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.[^/]+$).*)",
  ],
};

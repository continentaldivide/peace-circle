import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/supabase/database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Cookie-backed Supabase client for server components, route handlers, and
 * server actions.
 *
 * A fresh client per request, never shared: it closes over that request's
 * cookie store, so reusing one across requests would leak sessions between
 * members. `cookies()` is async in Next 16, hence the await at every call site.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL(),
    SUPABASE_PUBLISHABLE_KEY(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server components render after headers are sent, so their cookie
            // store is read-only and this throws. Safe to swallow: `proxy.ts`
            // refreshes the session on every request and writes the rotated
            // tokens back there. Route handlers and server actions *can* write,
            // which is why this is a try/catch rather than an omitted setAll.
          }
        },
      },
    },
  );
}

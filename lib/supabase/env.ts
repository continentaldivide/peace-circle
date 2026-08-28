/**
 * Supabase connection details, read in one place so a missing variable fails
 * with a useful message instead of surfacing later as an opaque "Invalid API
 * key" from the auth server.
 *
 * The values are read as literal `process.env.X` property accesses rather than
 * through a lookup helper on purpose: Next inlines `NEXT_PUBLIC_*` into the
 * browser bundle at build time only when it can see the static property path,
 * so dynamic indexing would leave the browser client with `undefined`.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Local values come from \`supabase status\`; hosted ones from the project's API settings.`,
    );
  }
  return value;
}

export const SUPABASE_URL = () =>
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const SUPABASE_PUBLISHABLE_KEY = () =>
  required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

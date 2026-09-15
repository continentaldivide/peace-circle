import type { Member } from "@/lib/data/types";
import type { Database } from "@/lib/supabase/database.types";
import { initialsFor } from "@/lib/utils";

/**
 * Where database rows become the shapes components use.
 *
 * Column names stop here: components see `tint`, never `avatar_tint`. Kept
 * apart from `index.ts` so `lib/dal.ts` can share these mappers without the
 * two modules importing each other, and pure so they can be tested without a
 * database.
 */

type Tables = Database["public"]["Tables"];

export type ProfileRow = Tables["profiles"]["Row"];

/** Avatar colour for a member who has not chosen one. */
const DEFAULT_TINT = "var(--ink-soft)";

export function toMember(
  row: Pick<ProfileRow, "id" | "name" | "role" | "avatar_tint">,
): Member {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    initials: initialsFor(row.name),
    tint: row.avatar_tint ?? DEFAULT_TINT,
  };
}

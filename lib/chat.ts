/**
 * The Circle chat's shared pieces: what sending a message can come back as,
 * and how a message that has not reached the database yet is told apart from
 * one that has.
 *
 * Separate from `app/actions/messages.ts` for the same reason lib/inquiries.ts
 * is separate from its action — a `"use server"` module may only export async
 * functions, and exporting a constant from one fails at module evaluation
 * rather than at build.
 */

import type { Message } from "@/lib/data/types";

/**
 * The id a message carries between the moment it is drawn and the moment the
 * database hands back the real row.
 *
 * Pending and saved messages share one list, so the prefix is what lets the
 * saved row replace the drawn one rather than appear beside it. A prefix
 * rather than a bare uuid because ids here are `messages.id` values: no uuid
 * can collide with a string that has a colon in it.
 */
export const PENDING_ID_PREFIX = "pending:";

/** Drawn, not yet saved — so the bubble can say so. */
export function isPending(message: Message): boolean {
  return message.id.startsWith(PENDING_ID_PREFIX);
}

/**
 * What `sendMessage` answers with. The saved message comes back rather than
 * just an id: it carries the `created_at` Postgres assigned, which is the
 * timestamp the bubble's time label and day divider should settle on.
 */
export type SendResult =
  { status: "sent"; message: Message } | { status: "error"; formError: string };

"use server";

import { getMessages } from "@/lib/data";
import type { MessagePage } from "@/lib/data";

/**
 * Fetch the page of Circle history immediately older than `cursor` (a
 * `nextCursor` returned by a previous page). Invoked from the client when the
 * member scrolls to the top of the chat. Phase 2 adds the auth/RLS check here.
 */
export async function loadOlderMessages(cursor: string): Promise<MessagePage> {
  return getMessages({ before: cursor });
}

"use server";

import { getMessages } from "@/lib/data";
import type { MessagePage } from "@/lib/data";

/**
 * Fetch the page of Circle history immediately older than `cursor` (a
 * `nextCursor` returned by a previous page). Invoked from the client when the
 * member scrolls to the top of the chat.
 *
 * A Server Action is its own public entry point — anyone can POST to it, not
 * only the page that renders the chat. The gate is `getMessages()`, which
 * calls `requireApproved()` before it reads, and it validates `cursor`, which
 * arrives from the browser. RLS backs both.
 */
export async function loadOlderMessages(cursor: string): Promise<MessagePage> {
  return getMessages({ before: cursor });
}

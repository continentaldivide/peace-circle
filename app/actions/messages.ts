"use server";

import type { SendResult } from "@/lib/chat";
import { requireApproved } from "@/lib/dal";
import { getMessages } from "@/lib/data";
import type { MessagePage } from "@/lib/data";
import { toMessage } from "@/lib/data/rows";
import { createClient } from "@/lib/supabase/server";
import { trimmedBody } from "@/lib/validation";

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

/**
 * Say something to the circle.
 *
 * The author is the session's, never the caller's: `messages_insert_own`
 * requires `author_id = auth.uid()` and an approved profile, so a POST that
 * named someone else would be refused by the database as well — but the id
 * never leaves the server to begin with.
 *
 * Deliberately no `refresh()`. Nothing else on Home reads the chat, and the
 * chat is the one list the server does not own: it accumulates older pages in
 * the browser as the member scrolls, so a re-render cannot replace it. The
 * saved row goes back to the caller instead, which swaps it for the message
 * drawn on send (see `lib/chat.ts`).
 */
export async function sendMessage(draft: string): Promise<SendResult> {
  const { userId } = await requireApproved();

  const body = trimmedBody(draft);
  if (!body) {
    // The form will not send an empty message, so reaching this means the
    // client was bypassed rather than that someone pressed enter too early.
    console.warn("[chat] rejected a message with an empty body");
    return { status: "error", formError: "Please write something first." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({ author_id: userId, body })
    // Read the row back in the same round trip: the id and created_at are the
    // database's to assign, and the chat needs both to settle the message it
    // has already drawn.
    .select("id, author_id, body, created_at")
    .single();

  if (error) {
    // The member sees one sentence and their words back in the box, so this
    // line is the only record of what actually failed.
    console.error(
      `[chat] could not save a message from ${userId}: ${error.code} ${error.message}`,
    );
    return {
      status: "error",
      formError: "That didn't send. Please try again.",
    };
  }

  return { status: "sent", message: toMessage(data) };
}

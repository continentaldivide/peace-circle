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

import type { Message, MessagePage } from "@/lib/data/types";

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

/**
 * The chat's list and where its history leaves off: everything `CircleChat`
 * shows, and the cursor for the page above it.
 *
 * The three change together, and a reply can arrive long after the state it
 * was asked from — a page of history requested before a reconnect replaced the
 * list, say — so they live in one reducer that can tell a stale answer from a
 * current one, rather than in three `useState`s that can't.
 */
export type ChatHistory = {
  /** Saved messages in order, then the ones still being sent. */
  messages: Message[];
  /** Where the next page of older history starts, or null for none. */
  cursor: string | null;
  hasMore: boolean;
};

export type ChatAction =
  /** A page of older history, fetched from the cursor named in `from`. */
  | { type: "older"; from: string; page: MessagePage }
  /** A message the member sent, drawn before it is saved. */
  | { type: "drawn"; message: Message }
  /** A drawn message the database refused, taken back. */
  | { type: "unsent"; pendingId: string }
  /** The database's row for a drawn message. */
  | { type: "sent"; pendingId: string; message: Message }
  /** Saved messages heard live, or re-read after the connection returned. */
  | { type: "received"; messages: Message[] }
  /** The newest page, read after the live connection (re)opened. */
  | { type: "caughtUp"; page: MessagePage };

export function initialHistory(page: MessagePage): ChatHistory {
  return {
    messages: page.messages,
    cursor: page.nextCursor,
    hasMore: page.hasMore,
  };
}

export function chatReducer(
  state: ChatHistory,
  action: ChatAction,
): ChatHistory {
  switch (action.type) {
    case "older": {
      // Asked for before the list was replaced: it belongs above a history
      // this chat no longer shows, and would leave a hole if prepended.
      if (action.from !== state.cursor) return state;
      const have = new Set(state.messages.map((m) => m.id));
      const fresh = action.page.messages.filter((m) => !have.has(m.id));
      return {
        messages: [...fresh, ...state.messages],
        cursor: action.page.nextCursor,
        hasMore: action.page.hasMore,
      };
    }
    case "drawn":
      return { ...state, messages: [...state.messages, action.message] };
    case "unsent":
      return {
        ...state,
        messages: state.messages.filter((m) => m.id !== action.pendingId),
      };
    case "sent": {
      // Realtime may have delivered this row before the action returned, and
      // already taken the drawn bubble away for it. Either way, one copy.
      const rest = state.messages.filter((m) => m.id !== action.pendingId);
      return { ...state, messages: withSaved(rest, [action.message]) };
    }
    case "received":
      return { ...state, messages: withSaved(state.messages, action.messages) };
    case "caughtUp": {
      const { page } = action;
      const saved = state.messages.filter((m) => !isPending(m));
      const newest = saved.at(-1);
      const oldestFetched = page.messages[0];
      // The newest page reaches back to what the chat already has — or is
      // the whole history — so it only fills in what was missed.
      if (
        !oldestFetched ||
        !page.hasMore ||
        (newest && compareMessages(oldestFetched, newest) <= 0)
      ) {
        return chatReducer(state, {
          type: "received",
          messages: page.messages,
        });
      }
      // More was said while away than one page holds. Merging would put the
      // newest page under the old history with a silent gap between them, so
      // start again from the newest, and let scrolling up fill in the rest.
      const pending = state.messages.filter(isPending);
      return {
        messages: withSaved(pending, page.messages),
        cursor: page.nextCursor,
        hasMore: page.hasMore,
      };
    }
  }
}

/**
 * Add saved messages to a list: each at its place in the history, none twice,
 * and the drawn bubbles still at the bottom.
 *
 * A saved message of the member's own that arrives while its bubble is still
 * drawn replaces the bubble — the oldest drawn one with the same words, since
 * rows come back in the order they were sent. Matching on the words is enough:
 * if two drawn bubbles say the same thing, which of them settles first makes
 * no difference to what is shown.
 */
function withSaved(list: Message[], incoming: Message[]): Message[] {
  const saved = new Map<string, Message>();
  let pending: Message[] = [];
  for (const m of list) {
    if (isPending(m)) pending.push(m);
    else saved.set(m.id, m);
  }
  for (const m of incoming) {
    if (saved.has(m.id)) continue;
    saved.set(m.id, m);
    const drawn = pending.findIndex(
      (p) => p.authorId === m.authorId && p.body === m.body,
    );
    if (drawn !== -1) pending = pending.filter((_, i) => i !== drawn);
  }
  return [...[...saved.values()].sort(compareMessages), ...pending];
}

/**
 * History order: `(created_at, id)`, as the database pages it. Compared to the
 * microsecond — `Date` alone keeps milliseconds, and two messages a few
 * microseconds apart would sort by id instead of by when they were said.
 */
function compareMessages(a: Message, b: Message): number {
  const [aMs, aMicros] = instant(a.createdAt);
  const [bMs, bMicros] = instant(b.createdAt);
  if (aMs !== bMs) return aMs - bMs;
  if (aMicros !== bMicros) return aMicros - bMicros;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** An ISO timestamp as milliseconds, plus the microseconds `Date` drops. */
function instant(iso: string): [number, number] {
  const fraction = /\.(\d+)/.exec(iso)?.[1] ?? "";
  return [Date.parse(iso), Number(fraction.padEnd(6, "0").slice(3, 6))];
}

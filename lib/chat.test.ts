/**
 * The chat's list, as messages reach it from three directions at once: sent by
 * this member, heard live from everyone, and re-read after a reconnect. Each
 * case is a race the browser can actually lose.
 */

import { describe, expect, test } from "vitest";

import {
  chatReducer,
  initialHistory,
  PENDING_ID_PREFIX,
  type ChatHistory,
} from "@/lib/chat";
import type { Message, MessagePage } from "@/lib/data/types";

const ME = "11111111-1111-1111-1111-111111111111";
const THEM = "22222222-2222-2222-2222-222222222222";

function saved(n: number, fields: Partial<Message> = {}): Message {
  return {
    id: `a0000000-0000-0000-0000-${String(n).padStart(12, "0")}`,
    authorId: THEM,
    body: `message ${n}`,
    createdAt: `2026-09-16T12:00:${String(n).padStart(2, "0")}.000000+00:00`,
    ...fields,
  };
}

function drawn(key: string, body: string): Message {
  return {
    id: `${PENDING_ID_PREFIX}${key}`,
    authorId: ME,
    body,
    createdAt: "2026-09-16T12:59:59.000Z",
  };
}

function page(messages: Message[], hasMore: boolean): MessagePage {
  return {
    messages,
    hasMore,
    nextCursor: hasMore ? `cursor-before-${messages[0].id}` : null,
  };
}

const ids = (state: ChatHistory) => state.messages.map((m) => m.id);

describe("received", () => {
  test("puts a live message after the history and before drawn bubbles", () => {
    let state = initialHistory(page([saved(1), saved(2)], false));
    state = chatReducer(state, { type: "drawn", message: drawn("x", "hi") });
    state = chatReducer(state, { type: "received", messages: [saved(3)] });
    expect(ids(state)).toEqual([
      saved(1).id,
      saved(2).id,
      saved(3).id,
      "pending:x",
    ]);
  });

  test("ignores a message the chat already shows", () => {
    const state = initialHistory(page([saved(1), saved(2)], false));
    const next = chatReducer(state, { type: "received", messages: [saved(2)] });
    expect(ids(next)).toEqual([saved(1).id, saved(2).id]);
  });

  test("orders by the microsecond, not by id", () => {
    const later = saved(1, {
      id: "00000000-0000-0000-0000-000000000000",
      createdAt: "2026-09-16T12:00:00.000900+00:00",
    });
    const earlier = saved(2, {
      id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
      createdAt: "2026-09-16T12:00:00.000100+00:00",
    });
    const state = chatReducer(initialHistory(page([], false)), {
      type: "received",
      messages: [later, earlier],
    });
    expect(ids(state)).toEqual([earlier.id, later.id]);
  });
});

describe("sending, when the live copy arrives first", () => {
  test("the live row replaces the bubble, and the action's reply adds nothing", () => {
    const mine = saved(3, { authorId: ME, body: "hello" });
    let state = initialHistory(page([saved(1)], false));
    state = chatReducer(state, { type: "drawn", message: drawn("x", "hello") });
    state = chatReducer(state, { type: "received", messages: [mine] });
    expect(ids(state)).toEqual([saved(1).id, mine.id]);
    state = chatReducer(state, {
      type: "sent",
      pendingId: "pending:x",
      message: mine,
    });
    expect(ids(state)).toEqual([saved(1).id, mine.id]);
  });

  test("the action's reply first, then the live row, still shows one copy", () => {
    const mine = saved(3, { authorId: ME, body: "hello" });
    let state = initialHistory(page([saved(1)], false));
    state = chatReducer(state, { type: "drawn", message: drawn("x", "hello") });
    state = chatReducer(state, {
      type: "sent",
      pendingId: "pending:x",
      message: mine,
    });
    state = chatReducer(state, { type: "received", messages: [mine] });
    expect(ids(state)).toEqual([saved(1).id, mine.id]);
  });

  test("the same words sent twice settle into two messages", () => {
    const first = saved(3, { authorId: ME, body: "ok" });
    const second = saved(4, { authorId: ME, body: "ok" });
    let state = initialHistory(page([], false));
    state = chatReducer(state, { type: "drawn", message: drawn("a", "ok") });
    state = chatReducer(state, { type: "drawn", message: drawn("b", "ok") });
    state = chatReducer(state, { type: "received", messages: [first] });
    state = chatReducer(state, {
      type: "sent",
      pendingId: "pending:b",
      message: second,
    });
    state = chatReducer(state, {
      type: "sent",
      pendingId: "pending:a",
      message: first,
    });
    state = chatReducer(state, { type: "received", messages: [second] });
    expect(ids(state)).toEqual([first.id, second.id]);
  });

  test("someone else saying the same words leaves the bubble drawn", () => {
    let state = initialHistory(page([], false));
    state = chatReducer(state, { type: "drawn", message: drawn("x", "hello") });
    state = chatReducer(state, {
      type: "received",
      messages: [saved(3, { body: "hello" })],
    });
    expect(ids(state)).toEqual([saved(3).id, "pending:x"]);
  });
});

describe("caughtUp", () => {
  test("fills in what was missed when the newest page overlaps", () => {
    const state = initialHistory(page([saved(3), saved(4)], true));
    const next = chatReducer(state, {
      type: "caughtUp",
      page: page([saved(4), saved(5), saved(6)], true),
    });
    expect(ids(next)).toEqual([3, 4, 5, 6].map((n) => saved(n).id));
    expect(next.cursor).toBe(state.cursor);
    expect(next.hasMore).toBe(true);
  });

  test("starts again from the newest page when a gap would be left", () => {
    let state = initialHistory(page([saved(1), saved(2)], true));
    state = chatReducer(state, { type: "drawn", message: drawn("x", "hi") });
    const newest = page([saved(8), saved(9)], true);
    const next = chatReducer(state, { type: "caughtUp", page: newest });
    expect(ids(next)).toEqual([saved(8).id, saved(9).id, "pending:x"]);
    expect(next.cursor).toBe(newest.nextCursor);
  });

  test("merges a newest page that is the whole history", () => {
    const state = initialHistory(page([saved(1)], false));
    const next = chatReducer(state, {
      type: "caughtUp",
      page: page([saved(1), saved(2)], false),
    });
    expect(ids(next)).toEqual([saved(1).id, saved(2).id]);
  });
});

describe("older", () => {
  test("prepends a page fetched from the current cursor", () => {
    const state = initialHistory(page([saved(3)], true));
    const next = chatReducer(state, {
      type: "older",
      from: state.cursor!,
      page: page([saved(1), saved(2)], false),
    });
    expect(ids(next)).toEqual([1, 2, 3].map((n) => saved(n).id));
    expect(next.hasMore).toBe(false);
  });

  test("drops a page fetched before the list was replaced", () => {
    const state = initialHistory(page([saved(3)], true));
    const staleCursor = state.cursor!;
    const replaced = chatReducer(state, {
      type: "caughtUp",
      page: page([saved(8), saved(9)], true),
    });
    const next = chatReducer(replaced, {
      type: "older",
      from: staleCursor,
      page: page([saved(1), saved(2)], false),
    });
    expect(next).toBe(replaced);
  });
});

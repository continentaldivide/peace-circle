import {
  MOCK_CIRCLE_EVENTS,
  MOCK_MEMBERS,
  MOCK_MESSAGES,
  MOCK_NEXT_MEETING,
  MOCK_RESOURCES,
  MOCK_UPCOMING_MEETINGS,
} from "@/lib/data/mock";
import type {
  CircleEvent,
  Meeting,
  Member,
  MessagePage,
  NextMeeting,
  Resource,
} from "@/lib/data/types";

export type {
  BookResource,
  CircleEvent,
  Comment,
  EventResource,
  LinkResource,
  Meeting,
  Member,
  Message,
  MessagePage,
  NextMeeting,
  PictureResource,
  QuoteResource,
  Resource,
  ResourceKind,
} from "@/lib/data/types";

/** Default page size for chat history reads. */
const MESSAGES_PAGE_SIZE = 15;

/**
 * The single data-access seam. Every page reads through these functions and
 * never touches the data source directly. In the prototype they return mock
 * data; in Phase 2 only their bodies change to call Supabase — the calling
 * components stay identical. Signatures are async to match that future.
 *
 * Note: prototype *mutations* (new resources/comments) live in client state
 * seeded from these reads; Phase 2 replaces those with server writes.
 */

export async function getResources(): Promise<Resource[]> {
  return MOCK_RESOURCES;
}

export async function getResource(id: string): Promise<Resource | null> {
  return MOCK_RESOURCES.find((r) => r.id === id) ?? null;
}

export async function getMembers(): Promise<Member[]> {
  return MOCK_MEMBERS;
}

export async function getMember(id: string): Promise<Member | null> {
  return MOCK_MEMBERS.find((m) => m.id === id) ?? null;
}

export async function getNextMeeting(): Promise<NextMeeting> {
  return MOCK_NEXT_MEETING;
}

export async function getUpcomingMeetings(): Promise<Meeting[]> {
  return MOCK_UPCOMING_MEETINGS;
}

/**
 * One page of Circle history, newest-first by page. Passing no `before` returns
 * the most recent `limit` messages; passing the previous page's `nextCursor`
 * returns the `limit` messages immediately older than it. Messages within a
 * page are chronological (oldest→newest).
 *
 * Phase 2 swaps this body for a Supabase query: `before` becomes a `created_at`
 * timestamp and this turns into `.lt("created_at", before).order(...).limit()`.
 * In the prototype the cursor is simply a message id.
 */
export async function getMessages(opts?: {
  before?: string;
  limit?: number;
}): Promise<MessagePage> {
  const limit = opts?.limit ?? MESSAGES_PAGE_SIZE;
  // MOCK_MESSAGES is oldest→newest; the cursor marks the oldest message the
  // caller already has, so we take the window ending just before it.
  const end =
    opts?.before === undefined
      ? MOCK_MESSAGES.length
      : MOCK_MESSAGES.findIndex((m) => m.id === opts.before);
  const sliceEnd = end === -1 ? MOCK_MESSAGES.length : end;
  const start = Math.max(0, sliceEnd - limit);
  const messages = MOCK_MESSAGES.slice(start, sliceEnd);
  return {
    messages,
    hasMore: start > 0,
    nextCursor: messages.length ? messages[0].id : null,
  };
}

export async function getCircleEvents(): Promise<CircleEvent[]> {
  return MOCK_CIRCLE_EVENTS;
}

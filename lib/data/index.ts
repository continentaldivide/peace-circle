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
  Message,
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
  NextMeeting,
  PictureResource,
  QuoteResource,
  Resource,
  ResourceKind,
} from "@/lib/data/types";

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

export async function getMessages(): Promise<Message[]> {
  return MOCK_MESSAGES;
}

export async function getCircleEvents(): Promise<CircleEvent[]> {
  return MOCK_CIRCLE_EVENTS;
}

import type { Comment, EventItem, Post, Profile } from "@/lib/data/types";

// Throwaway sample data for the prototype. Phase 2 deletes this file once the
// accessors in `index.ts` read from Supabase.

export const MOCK_PROFILES: Profile[] = [
  { id: "u-gail", name: "Gail", status: "approved", isAdmin: true },
  { id: "u-mara", name: "Mara", status: "approved", isAdmin: false },
  { id: "u-theo", name: "Theo", status: "approved", isAdmin: false },
  { id: "u-new", name: "Sam", status: "pending", isAdmin: false },
];

export const MOCK_POSTS: Post[] = [
  {
    id: "p-1",
    authorId: "u-gail",
    type: "quote",
    body: "Peace is not the absence of conflict, but the presence of justice.",
    createdAt: "2026-06-05T15:00:00Z",
  },
  {
    id: "p-2",
    authorId: "u-mara",
    type: "link",
    body: "A short read on restorative circles that came up at the last meeting.",
    url: "https://example.org/restorative-circles",
    createdAt: "2026-06-03T18:30:00Z",
  },
  {
    id: "p-3",
    authorId: "u-theo",
    type: "text",
    body: "Reflections from Sunday's gathering — grateful for the new faces.",
    createdAt: "2026-05-28T09:15:00Z",
  },
];

export const MOCK_COMMENTS: Comment[] = [
  {
    id: "c-1",
    postId: "p-1",
    authorId: "u-mara",
    body: "This one stays with me. Thank you for sharing.",
    createdAt: "2026-06-05T16:10:00Z",
  },
  {
    id: "c-2",
    postId: "p-2",
    authorId: "u-theo",
    body: "Bookmarking this for the next discussion.",
    createdAt: "2026-06-04T08:00:00Z",
  },
];

export const MOCK_EVENTS: EventItem[] = [
  {
    id: "e-1",
    title: "Monthly Peace Circle",
    description: "Our regular gathering — all approved members welcome.",
    location: "Friends Meeting House",
    startsAt: "2026-07-12T18:00:00Z",
    endsAt: "2026-07-12T20:00:00Z",
    createdBy: "u-gail",
  },
];

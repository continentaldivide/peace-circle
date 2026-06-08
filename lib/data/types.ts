// Shapes mirror the Phase 2 data model (see PLAN.md). UI components depend only
// on these types and the accessor functions in `index.ts` — never on where the
// data comes from. Phase 2 backs the same functions with Supabase queries.

export type MemberStatus = "pending" | "approved";

export type Profile = {
  id: string;
  name: string;
  status: MemberStatus;
  isAdmin: boolean;
};

export type PostType = "quote" | "link" | "image" | "text";

export type Post = {
  id: string;
  authorId: string;
  type: PostType;
  body: string;
  /** Present for `link` posts. */
  url?: string;
  /** Storage path for `image` posts. */
  imagePath?: string;
  createdAt: string; // ISO 8601
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO 8601
};

export type EventItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string; // ISO 8601
  endsAt: string; // ISO 8601
  createdBy: string;
};

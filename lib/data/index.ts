import {
  MOCK_COMMENTS,
  MOCK_EVENTS,
  MOCK_POSTS,
  MOCK_PROFILES,
} from "@/lib/data/mock";
import type { Comment, EventItem, Post, Profile } from "@/lib/data/types";

export type {
  Comment,
  EventItem,
  MemberStatus,
  Post,
  PostType,
  Profile,
} from "@/lib/data/types";

/**
 * The single data-access seam. Every page reads through these functions and
 * never touches the data source directly. In the prototype they return mock
 * arrays; in Phase 2 only their bodies change to call Supabase — the calling
 * components stay identical. Signatures are async to match that future.
 */

export async function getPosts(): Promise<Post[]> {
  return [...MOCK_POSTS].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPost(id: string): Promise<Post | null> {
  return MOCK_POSTS.find((p) => p.id === id) ?? null;
}

export async function getComments(postId: string): Promise<Comment[]> {
  return MOCK_COMMENTS.filter((c) => c.postId === postId).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

export async function searchPosts(query: string): Promise<Post[]> {
  const q = query.trim().toLowerCase();
  const posts = await getPosts();
  if (!q) return posts;
  return posts.filter((p) => p.body.toLowerCase().includes(q));
}

export async function getEvents(): Promise<EventItem[]> {
  return [...MOCK_EVENTS].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function getProfile(id: string): Promise<Profile | null> {
  return MOCK_PROFILES.find((p) => p.id === id) ?? null;
}

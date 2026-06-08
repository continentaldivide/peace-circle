import type { ComponentType } from "react";

/**
 * The full set of pages each design variant must provide. The active route
 * segment (`/d1/...`, `/d2/...`) selects which design's set renders. In the
 * prototype every page is duplicated per design so Gail can compare complete,
 * structurally-distinct designs end to end.
 *
 * Phase 1 replaces the placeholder components with the real round-2 designs.
 */
export type DesignPages = {
  /** Public landing page / hero (the `/[design]` index). */
  Landing: ComponentType;
  /** Passwordless sign-up (magic link). */
  SignUp: ComponentType;
  /** Pending-approval holding page shown before Gail approves a member. */
  Pending: ComponentType;
  /** Member feed — newest posts first. */
  Feed: ComponentType;
  /** Single post + comment thread. */
  Post: ComponentType<{ id: string }>;
  /** Searchable library of past posts. */
  Library: ComponentType;
  /** Upcoming events calendar. */
  Calendar: ComponentType;
  /** Gail's admin area (approval queue, moderation, event management). */
  Admin: ComponentType;
};

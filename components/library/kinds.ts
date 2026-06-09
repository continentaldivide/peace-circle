import type { ResourceKind } from "@/lib/data";

/** Filter chips, in the handoff's order. */
export const KIND_FILTERS: { id: ResourceKind | "all"; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "quote", label: "Quotes" },
  { id: "link", label: "Links" },
  { id: "book", label: "Books" },
  { id: "picture", label: "Pictures" },
  { id: "event", label: "Events" },
];

/** Kind labels used in the kind tag and composer picker. */
export const KIND_LABELS: Record<ResourceKind, string> = {
  quote: "Quote",
  link: "Link",
  picture: "Picture",
  book: "Book",
  event: "Event",
};

/** Author info resolved for display (members + the signed-in "you"). */
export type AuthorInfo = { name: string; initials: string; tint: string };

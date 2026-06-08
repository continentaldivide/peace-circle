import { PagePlaceholder } from "@/designs/PagePlaceholder";
import type { DesignPages } from "@/designs/types";

const D = "Design 2";

// Phase 1: replace each placeholder with this design's real page component.
export const Landing: DesignPages["Landing"] = () => (
  <PagePlaceholder design={D} page="Landing" detail="Hero + call to action" />
);
export const SignUp: DesignPages["SignUp"] = () => (
  <PagePlaceholder design={D} page="Sign up" detail="Magic-link sign-up" />
);
export const Pending: DesignPages["Pending"] = () => (
  <PagePlaceholder
    design={D}
    page="Pending approval"
    detail="Awaiting Gail's approval"
  />
);
export const Feed: DesignPages["Feed"] = () => (
  <PagePlaceholder design={D} page="Feed" detail="Newest posts first" />
);
export const Post: DesignPages["Post"] = ({ id }) => (
  <PagePlaceholder design={D} page="Post" detail={`Post ${id} + comments`} />
);
export const Library: DesignPages["Library"] = () => (
  <PagePlaceholder design={D} page="Library" detail="Searchable archive" />
);
export const Calendar: DesignPages["Calendar"] = () => (
  <PagePlaceholder design={D} page="Calendar" detail="Upcoming events" />
);
export const Admin: DesignPages["Admin"] = () => (
  <PagePlaceholder
    design={D}
    page="Admin"
    detail="Approval queue + moderation"
  />
);

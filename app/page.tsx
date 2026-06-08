import { redirect } from "next/navigation";

import { DEFAULT_DESIGN } from "@/designs/meta";

// The prototype always lives under a design segment. A bare `/` lands on the
// default design; the switcher in the header moves between them from there.
export default function RootPage() {
  redirect(`/${DEFAULT_DESIGN}`);
}

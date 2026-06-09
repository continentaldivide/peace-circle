import { redirect } from "next/navigation";

import { DEFAULT_VARIANT } from "@/lib/variants";

// The prototype always lives under a variant segment. A bare `/` lands on the
// default variant; the switcher in the header moves between them from there.
export default function RootPage() {
  redirect(`/${DEFAULT_VARIANT}`);
}

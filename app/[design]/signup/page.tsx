import { getDesignPages } from "@/designs/registry";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ design: string }>;
}) {
  const { design } = await params;
  const { SignUp } = getDesignPages(design);
  return <SignUp />;
}

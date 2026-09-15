import { AuthFlow } from "@/components/auth/auth-flow";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // The callback route sends failures back here as ?error= — an expired link,
  // or a code that was already spent.
  const { error } = await searchParams;
  return <AuthFlow initialError={error} />;
}

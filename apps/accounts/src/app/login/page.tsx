import type { Metadata } from "next";
import { safeRedirectPath } from "@workspace/core/redirect";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In | Accounts",
};

// Reached two ways: directly (optionally with ?redirectTo=/path), or from a client
// app's /oauth2/authorize, which adds the authorization request plus a signature
// (`sig`). The signature is checked server-side when the sign-in is submitted.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirectTo = safeRedirectPath(
    typeof params.redirectTo === "string" ? params.redirectTo : null,
    "/account"
  );
  const isOAuthRequest = typeof params.sig === "string" && typeof params.client_id === "string";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <LoginForm redirectTo={redirectTo} isOAuthRequest={isOAuthRequest} />
    </div>
  );
}

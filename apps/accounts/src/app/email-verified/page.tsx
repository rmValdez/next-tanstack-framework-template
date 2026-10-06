import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@workspace/ui/card";
import { Button } from "@workspace/ui/button";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Email Verification | Accounts",
};

const ERROR_MESSAGES: Record<string, string> = {
  TOKEN_EXPIRED: "This verification link has expired.",
  INVALID_TOKEN: "This verification link is invalid.",
  USER_NOT_FOUND: "No account matches this verification link.",
};

// Landing page for the emailed verification link. Better Auth's
// GET /api/auth/verify-email marks the user verified, signs them in
// (autoSignInAfterVerification), and redirects here — or redirects here with
// ?error=<CODE> when the token is rejected.
export default async function EmailVerifiedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error } = await searchParams;
  const errorCode = typeof error === "string" ? error : null;
  const session = errorCode ? null : await getCurrentSession();
  const signedIn = Boolean(session?.user.emailVerified);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 text-center backdrop-blur-xl">
        {errorCode ? (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 shadow-inner">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Verification failed</h1>
            <p className="mt-2 text-sm text-slate-400">
              {ERROR_MESSAGES[errorCode] ?? "We couldn't verify your email address."} Sign in to
              request a new link.
            </p>
            <Link href="/login" className="mt-6 block">
              <Button fullWidth>Back to sign in</Button>
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 shadow-inner">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Email verified</h1>
            <p className="mt-2 text-sm text-slate-400">
              {signedIn
                ? "Your account is active and you're signed in."
                : "If your link was valid, your account is now active. Sign in to continue."}
            </p>
            <Link href={signedIn ? "/account" : "/login"} className="mt-6 block">
              <Button fullWidth>{signedIn ? "Continue to your account" : "Go to sign in"}</Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}

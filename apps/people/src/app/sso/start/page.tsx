import Link from "next/link";
import { redirect } from "next/navigation";
import { ServerCrash } from "lucide-react";
import { accountsUrl } from "@workspace/core/urls";
import { safeRedirectPath } from "@workspace/core/redirect";
import { Card } from "@workspace/ui/card";
import { getCurrentSession } from "@/lib/session";
import { SsoRedirect } from "./SsoRedirect";

export const dynamic = "force-dynamic";

const HEALTH_TIMEOUT_MS = 3000;

// Checked before sending the browser to accounts: if accounts is down the user gets
// an explanation here instead of a browser connection error on another origin.
async function accountsIsUp(): Promise<boolean> {
  try {
    const response = await fetch(`${accountsUrl}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default async function SsoStartPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  // Only same-origin paths: this value becomes the post-login callbackURL.
  const target = safeRedirectPath(redirectTo, "/dashboard");

  if (await getCurrentSession()) {
    redirect(target);
  }

  if (!(await accountsIsUp())) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 text-center backdrop-blur-xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <ServerCrash className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Sign-in is unavailable</h1>
          <p className="mt-1 text-xs text-slate-400">
            The accounts service is not responding. Try again in a moment.
          </p>
          <Link
            href={`/sso/start?redirectTo=${encodeURIComponent(target)}`}
            className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400 active:scale-[0.98]"
          >
            Try Again
          </Link>
        </Card>
      </main>
    );
  }

  return <SsoRedirect callbackURL={target} />;
}

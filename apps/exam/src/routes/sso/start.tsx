import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Loader2, ServerCrash } from "lucide-react";
import { z } from "zod";
import { safeRedirectPath } from "@workspace/core/redirect";
import { accountsUrl } from "@workspace/core/urls";
import { Button } from "@workspace/ui/button";
import { Card } from "@workspace/ui/card";
import { signInWithAccounts } from "@/lib/auth-client";
import { getSessionFn } from "@/server/session";

const HEALTH_TIMEOUT_MS = 3000;

// Checked before sending the browser to accounts: if accounts is down the user gets an
// explanation here instead of a browser connection error on another origin.
const accountsIsUpFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const response = await fetch(`${accountsUrl}/api/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
});

export const Route = createFileRoute("/sso/start")({
  validateSearch: z.object({ redirectTo: z.string().optional() }),
  beforeLoad: async ({ search }) => {
    // Only same-origin paths: this value becomes the post-login callbackURL.
    const target = safeRedirectPath(search.redirectTo, "/dashboard");
    if (await getSessionFn()) throw redirect({ href: target });
    return { target };
  },
  loader: () => accountsIsUpFn(),
  component: SsoStartPage,
});

function SsoStartPage() {
  const accountsUp = Route.useLoaderData();
  const { target } = Route.useRouteContext();

  if (!accountsUp) {
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
            to="/sso/start"
            search={{ redirectTo: target }}
            reloadDocument
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

// The handshake starts in the browser because the sign-in request sets the state and PKCE
// cookies that the callback checks.
function SsoRedirect({ callbackURL }: { callbackURL: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void signInWithAccounts(callbackURL).then((started) => {
      if (!started) setFailed(true);
    });
  }, [callbackURL]);

  if (failed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-slate-400">Could not start sign-in.</p>
        <Button
          onClick={() => {
            setFailed(false);
            void signInWithAccounts(callbackURL).then((started) => {
              if (!started) setFailed(true);
            });
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex items-center gap-3 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
        <span className="text-sm">Signing you in through accounts…</span>
      </div>
    </div>
  );
}

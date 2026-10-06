import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { z } from "zod";
import { Button } from "@workspace/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { getSessionFn } from "@/server/session";

// Codes Better Auth appends as ?error= when the OAuth callback fails.
const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "The sign-in took too long or was started twice. Please try again.",
  please_restart_the_process: "The sign-in took too long or was started twice. Please try again.",
  access_denied: "Sign-in was cancelled.",
  invalid_code: "The sign-in could not be completed. Please try again.",
};

export const Route = createFileRoute("/")({
  validateSearch: z.object({ error: z.string().optional() }),
  loader: () => getSessionFn(),
  component: HomePage,
});

function HomePage() {
  const session = Route.useLoaderData();
  const { error } = Route.useSearch();
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again.")
    : null;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader>
        {session ? (
          <Link to="/dashboard">
            <Button variant="ghost" className="text-xs md:text-sm">
              Dashboard
            </Button>
          </Link>
        ) : null}
      </AppHeader>

      <section className="relative overflow-hidden px-6 pb-20 pt-24 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[350px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="mx-auto max-w-3xl space-y-6">
          {errorMessage && (
            <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            <span className="text-gradient">Workspace</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-400 sm:text-lg">
            Projects, tasks, documents and shared workspaces. Sign in with your company account.
          </p>
          <div className="flex justify-center pt-2">
            {session ? (
              <Link to="/dashboard" className="w-full sm:w-auto">
                <Button fullWidth className="h-12 px-8 text-base">
                  Go to dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link
                to="/sso/start"
                search={{ redirectTo: "/dashboard" }}
                className="w-full sm:w-auto"
              >
                <Button fullWidth className="h-12 px-8 text-base">
                  Sign in <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-900 px-6 py-8 text-center text-xs text-slate-500">
        <p>
          TanStack Start · TanStack Router and Query · Better Auth (OIDC client) · Prisma, own
          database.
        </p>
      </footer>
    </div>
  );
}

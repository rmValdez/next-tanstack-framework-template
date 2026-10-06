import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { cn } from "@workspace/ui/cn";
import { AppHeader } from "@/components/AppHeader";
import { UserMenu } from "@/components/UserMenu";
import { getSessionFn } from "@/server/session";

// Pathless layout for signed-in pages (the Start equivalent of the Next apps' (app) group).
// beforeLoad runs on SSR and on every client navigation, so it knows the requested path and
// can send the user back there after sign-in. It is page UX only: server functions that
// return private data check the session themselves.
export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const session = await getSessionFn();
    if (!session) {
      throw redirect({ to: "/sso/start", search: { redirectTo: location.href } });
    }
    return { session };
  },
  component: AppLayout,
});

const LINKS = [{ to: "/dashboard", label: "Dashboard" }] as const;

function AppLayout() {
  const { session } = Route.useRouteContext();
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <AppHeader
        nav={
          <nav className="flex items-center gap-1">
            {LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  pathname.startsWith(to)
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        }
      >
        <UserMenu user={session.user} />
      </AppHeader>
      <main className="mx-auto w-full max-w-6xl flex-1 p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}

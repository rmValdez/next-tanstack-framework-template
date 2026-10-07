import { AppHeader } from "@/components/AppHeader";
import { AppNav } from "@/components/AppNav";
import { UserMenu } from "@/components/UserMenu";

// Shell for signed-in pages. The guard is in each page (requireAuth with its own path),
// not here: a layout doesn't know the requested path, so it couldn't send the user back
// to the right page after sign-in.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <AppHeader nav={<AppNav />}>
        <UserMenu />
      </AppHeader>
      <main className="mx-auto w-full max-w-6xl flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}

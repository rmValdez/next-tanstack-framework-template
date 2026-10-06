import { Database, KeyRound, Link2, User } from "lucide-react";
import { webDb } from "@workspace/web-db";
import { Card } from "@workspace/ui/card";
import { AppHeader } from "@/components/AppHeader";
import { UserMenu } from "@/components/UserMenu";
import { requireAuth } from "@/lib/session";
import { ACCOUNTS_PROVIDER_ID } from "@/lib/sso";

export default async function DashboardPage() {
  // The layout already guards this route; calling again returns the cached session
  // and gives this page a typed, non-null user.
  const { user, session } = await requireAuth("/dashboard");

  // The link between this app's shadow user and the identity in accounts.
  const link = await webDb.account.findFirst({
    where: { userId: user.id, providerId: ACCOUNTS_PROVIDER_ID },
    select: { accountId: true, updatedAt: true },
  });

  const fields = [
    { label: "web user id (web_db)", value: user.id },
    { label: "accounts user id (sub)", value: link?.accountId ?? "N/A" },
    { label: "Email", value: user.email },
    { label: "Name", value: user.name || "Not set" },
    { label: "Last synced from accounts", value: link?.updatedAt.toISOString() ?? "N/A" },
    { label: "Session expires", value: session.expiresAt.toISOString() },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader>
        <UserMenu />
      </AppHeader>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 p-6 md:p-10">
        <div>
          <h2 className="mb-1 text-2xl font-bold tracking-tight text-white">Dashboard</h2>
          <p className="text-sm text-slate-400">
            You signed in through accounts. This app keeps its own copy of your profile and its own
            session.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="flex items-center gap-4 p-5">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-400">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Signed in via</p>
              <p className="text-base font-semibold text-slate-100">accounts (OIDC + PKCE)</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4 p-5">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
              <Link2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Identity link</p>
              <p className="text-base font-semibold text-slate-100">
                {link ? "Linked" : "Missing"}
              </p>
            </div>
          </Card>
          <Card className="flex items-center gap-4 p-5">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Own data</p>
              <p className="text-base font-semibold text-slate-100">web_db (PostgreSQL)</p>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
            <User className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-slate-100">Shadow user in web_db</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 font-mono text-xs sm:grid-cols-2">
            {fields.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3"
              >
                <span className="mb-1 block text-slate-500">{label}:</span>
                <span className="break-all text-cyan-300">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}

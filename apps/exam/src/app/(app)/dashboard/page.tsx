import { KeyRound, Database } from "lucide-react";
import { examDb } from "@workspace/exam-db";
import { Card } from "@workspace/ui/card";
import { requireAuth } from "@/lib/session";
import { ACCOUNTS_PROVIDER_ID } from "@/lib/sso";

// Scaffolded from apps/hr: sign-in, session and the exam schema work; domain features
// arrive in phase 10 (docs/implementation-plan.md). Use apps/hr as the reference.
export default async function DashboardPage() {
  const { user, session } = await requireAuth("/dashboard");

  // The link between this app's shadow user and the identity in accounts.
  const link = await examDb.account.findFirst({
    where: { userId: user.id, providerId: ACCOUNTS_PROVIDER_ID },
    select: { accountId: true, updatedAt: true },
  });

  const identity = [
    { label: "Exam user id (exam.user)", value: user.id },
    { label: "accounts user id (sub)", value: link?.accountId ?? "N/A" },
    { label: "Email", value: user.email },
    { label: "Last synced from accounts", value: link?.updatedAt.toISOString() ?? "N/A" },
    { label: "Session expires", value: session.expiresAt.toISOString() },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-2xl font-bold tracking-tight text-white">
          Welcome, {user.name.split(" ")[0]}
        </h2>
        <p className="text-sm text-slate-400">
          Exam owns the <code>exam</code> schema of company_db. Domain features arrive in phase 10.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="flex items-center gap-4 p-5">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Signed in via</p>
            <p className="text-base font-semibold text-slate-100">accounts (OIDC + PKCE)</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Own data</p>
            <p className="text-base font-semibold text-slate-100">company_db, schema exam</p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="mb-4 border-b border-slate-800 pb-4 text-base font-semibold text-slate-100">
          Your identity in Exam
        </h3>
        <dl className="space-y-3 font-mono text-xs">
          {identity.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-slate-500">{label}</dt>
              <dd className="break-all text-cyan-300">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}

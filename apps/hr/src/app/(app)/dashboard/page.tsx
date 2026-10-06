import Link from "next/link";
import { ArrowRight, Building2, KeyRound, Users } from "lucide-react";
import { hrDb } from "@workspace/hr-db";
import { Card } from "@workspace/ui/card";
import { requireAuth } from "@/lib/session";
import { ACCOUNTS_PROVIDER_ID } from "@/lib/sso";

export default async function DashboardPage() {
  const { user, session } = await requireAuth("/dashboard");

  const [headcount, departments, link] = await Promise.all([
    hrDb.employee.count({ where: { status: { not: "TERMINATED" } } }),
    hrDb.department.findMany({
      select: {
        name: true,
        _count: { select: { employees: { where: { status: { not: "TERMINATED" } } } } },
      },
      orderBy: { name: "asc" },
    }),
    // The link between HR's shadow user and the identity in accounts.
    hrDb.account.findFirst({
      where: { userId: user.id, providerId: ACCOUNTS_PROVIDER_ID },
      select: { accountId: true, updatedAt: true },
    }),
  ]);

  const identity = [
    { label: "HR user id (hr.user)", value: user.id },
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
          HR owns the employee records in the <code>hr</code> schema of company_db.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="flex items-center gap-4 p-5">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Headcount</p>
            <p className="text-2xl font-semibold text-slate-100">{headcount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Departments</p>
            <p className="text-2xl font-semibold text-slate-100">{departments.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Signed in via</p>
            <p className="text-base font-semibold text-slate-100">accounts (OIDC + PKCE)</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-base font-semibold text-slate-100">Headcount by department</h3>
            <Link
              href="/employees"
              className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
            >
              Employees <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {departments.map((department) => (
              <li key={department.name} className="flex justify-between text-slate-300">
                <span>{department.name}</span>
                <span className="font-mono text-slate-100">{department._count.employees}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 border-b border-slate-800 pb-4 text-base font-semibold text-slate-100">
            Your identity in HR
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
    </div>
  );
}

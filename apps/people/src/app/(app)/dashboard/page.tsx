import Link from "next/link";
import { ArrowRight, Building2, CalendarCheck, FileUser, KeyRound, UserCheck, Users } from "lucide-react";
import { peopleDb } from "@workspace/people-db";
import { Card } from "@workspace/ui/card";
import { requireAuth } from "@/lib/session";
import { ACCOUNTS_PROVIDER_ID } from "@/lib/sso";

export default async function DashboardPage() {
  const { user, session } = await requireAuth("/dashboard");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [headcount, departments, openJobs, activeCandidates, todayAttendance, link] = await Promise.all([
    peopleDb.employee.count({ where: { status: { not: "TERMINATED" } } }),
    peopleDb.department.findMany({
      select: {
        name: true,
        _count: { select: { employees: { where: { status: { not: "TERMINATED" } } } } },
      },
      orderBy: { name: "asc" },
    }),
    peopleDb.jobOpening.count({ where: { status: "OPEN" } }),
    peopleDb.candidate.count({ where: { status: { notIn: ["HIRED", "REJECTED"] } } }),
    peopleDb.attendanceRecord.count({ where: { date: today, status: "PRESENT" } }),
    // The link between People's shadow user and the identity in accounts.
    peopleDb.account.findFirst({
      where: { userId: user.id, providerId: ACCOUNTS_PROVIDER_ID },
      select: { accountId: true, updatedAt: true },
    }),
  ]);

  const identity = [
    { label: "People user id (people.user)", value: user.id },
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
          People Operations bounded context owns <code>people_db</code> (HR, Recruitment & Attendance).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
            <FileUser className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Open Jobs</p>
            <p className="text-2xl font-semibold text-slate-100">{openJobs}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-purple-400">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Active Candidates</p>
            <p className="text-2xl font-semibold text-slate-100">{activeCandidates}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Present Today</p>
            <p className="text-2xl font-semibold text-slate-100">{todayAttendance}</p>
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
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-base font-semibold text-slate-100">Quick Links</h3>
            <span className="text-xs text-slate-500">Bounded Context Features</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/recruitment"
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700 hover:bg-slate-800/50"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">Recruitment</p>
                <p className="text-xs text-slate-400">Jobs & candidate pipeline</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link
              href="/attendance"
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700 hover:bg-slate-800/50"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">Attendance</p>
                <p className="text-xs text-slate-400">Daily check-in & shift logs</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="mb-4 border-b border-slate-800 pb-4 text-base font-semibold text-slate-100">
          Your identity in People Operations
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

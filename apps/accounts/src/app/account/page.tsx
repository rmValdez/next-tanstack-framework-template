"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { Button } from "@workspace/ui/button";
import { Card } from "@workspace/ui/card";
import { cn } from "@workspace/ui/cn";
import { LogOut, User, Shield, Activity, Database } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading, error } = useAuthSession();

  const authStatus = isLoading ? "Validating..." : error ? "Unavailable" : "Active & Verified";

  const handleSignOut = async () => {
    await authClient.signOut();
    toast.success("Signed out.");
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Top Navigation */}
      <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/20 text-sm font-bold text-cyan-400">
            A
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100">Accounts</h1>
            <p className="text-xs text-slate-400">Authenticated Session</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium text-slate-200">{user?.name || "Operator"}</p>
            <p className="text-[11px] text-slate-400">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="h-8 px-3 text-xs">
            <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 p-6 md:p-10">
        <div>
          <h2 className="mb-1 text-2xl font-bold tracking-tight text-white">Your Account</h2>
          <p className="text-sm text-slate-400">
            This is your central account. Every app you use signs in through it.
          </p>
        </div>

        {/* Status Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="flex items-center gap-4 p-5">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-400">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Auth Status</p>
              <p
                className={cn("text-base font-semibold", error ? "text-red-400" : "text-slate-100")}
              >
                {authStatus}
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 p-5">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Session Mode</p>
              <p className="text-base font-semibold text-slate-100">Central identity (OIDC)</p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 p-5">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Persistence Adapter</p>
              <p className="text-base font-semibold text-slate-100">Prisma (PostgreSQL)</p>
            </div>
          </Card>
        </div>

        {/* User Details Card */}
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
            <User className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-slate-100">Current User Claims</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 font-mono text-xs sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
              <span className="mb-1 block text-slate-500">User ID:</span>
              <span className="break-all text-cyan-300">{user?.id || "N/A"}</span>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
              <span className="mb-1 block text-slate-500">Email:</span>
              <span className="break-all text-cyan-300">{user?.email || "N/A"}</span>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
              <span className="mb-1 block text-slate-500">Name:</span>
              <span className="text-cyan-300">{user?.name || "Not set"}</span>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
              <span className="mb-1 block text-slate-500">Email Verified:</span>
              <span className="text-cyan-300">{user?.emailVerified ? "Yes" : "No"}</span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

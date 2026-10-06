import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex items-center gap-3 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
        <span className="text-sm">Verifying session…</span>
      </div>
    </div>
  );
}

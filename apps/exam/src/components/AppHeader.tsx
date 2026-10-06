import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export function AppHeader({
  nav,
  children,
}: {
  nav?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/20 text-cyan-400">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-slate-100">
            Exam<span className="text-cyan-400">.</span>
          </span>
        </Link>
        {nav}
      </div>
      <div className="flex items-center gap-4">{children}</div>
    </header>
  );
}

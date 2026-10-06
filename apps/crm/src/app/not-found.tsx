import Link from "next/link";
import { Compass } from "lucide-react";
import { Card } from "@workspace/ui/card";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 text-center backdrop-blur-xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
          <Compass className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">Page Not Found</h1>
        <p className="mt-1 text-xs text-slate-400">That page does not exist.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400 active:scale-[0.98]"
        >
          Back to Home
        </Link>
      </Card>
    </main>
  );
}

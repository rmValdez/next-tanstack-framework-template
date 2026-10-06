"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@workspace/ui/button";
import { Card } from "@workspace/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 text-center backdrop-blur-xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">Something went wrong</h1>
        <p className="mt-1 text-xs text-slate-400">
          An unexpected error occurred. Try again, or reload the page if it persists.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-slate-500">Digest: {error.digest}</p>
        )}
        <Button onClick={reset} fullWidth className="mt-6">
          Try Again
        </Button>
      </Card>
    </main>
  );
}

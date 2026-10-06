"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/button";
import { signInWithAccounts } from "@/lib/auth-client";

// The handshake starts in the browser because the sign-in request sets the state and
// PKCE cookies that the callback checks; a server redirect could not set them first.
export function SsoRedirect({ callbackURL }: { callbackURL: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void signInWithAccounts(callbackURL).then((started) => {
      if (!started) setFailed(true);
    });
  }, [callbackURL]);

  if (failed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-slate-400">Could not start sign-in.</p>
        <Button
          onClick={() => {
            setFailed(false);
            void signInWithAccounts(callbackURL).then((started) => {
              if (!started) setFailed(true);
            });
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex items-center gap-3 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
        <span className="text-sm">Signing you in through accounts…</span>
      </div>
    </div>
  );
}

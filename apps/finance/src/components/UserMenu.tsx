"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/button";
import { authClient } from "@/lib/auth-client";
import { useAuthSession } from "@/hooks/useAuthSession";

export function UserMenu() {
  const { user } = useAuthSession();
  const [pending, setPending] = useState(false);

  // Global sign-out (D19): ends this app's session, then the client follows the returned
  // URL to accounts' end-session endpoint. Ending the accounts session makes accounts send a
  // back-channel logout to every other app the user signed in to, and redirects back here.
  const signOut = async () => {
    setPending(true);
    const { error } = await authClient.signOut();
    if (error) {
      setPending(false);
      toast.error("Could not sign out. Try again.");
    }
  };

  return (
    <>
      <div className="hidden text-right sm:block">
        <p className="text-xs font-medium text-slate-200">{user?.name}</p>
        <p className="text-[11px] text-slate-400">{user?.email}</p>
      </div>
      <Button variant="outline" onClick={signOut} disabled={pending} className="h-8 px-3 text-xs">
        <LogOut className="mr-1.5 h-3.5 w-3.5" /> {pending ? "Signing out…" : "Sign out"}
      </Button>
    </>
  );
}

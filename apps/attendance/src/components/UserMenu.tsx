"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/button";
import { authClient } from "@/lib/auth-client";
import { useAuthSession } from "@/hooks/useAuthSession";

export function UserMenu() {
  const router = useRouter();
  const { user, invalidate } = useAuthSession();
  const [pending, setPending] = useState(false);

  // Ends the Attendance session only. The accounts session stays, so the next sign-in here
  // is one click.
  const signOutHere = async () => {
    setPending(true);
    await authClient.signOut({ disableRedirect: true });
    await invalidate();
    toast.success("Signed out of Attendance.");
    router.push("/");
    router.refresh();
  };

  // Ends the Attendance session, then the client follows the returned URL to accounts'
  // end-session endpoint, which ends the accounts session and sends the browser back.
  const signOutEverywhere = async () => {
    setPending(true);
    const { error } = await authClient.signOut();
    if (error) {
      setPending(false);
      toast.error("Could not sign out of accounts.");
    }
  };

  return (
    <>
      <div className="hidden text-right sm:block">
        <p className="text-xs font-medium text-slate-200">{user?.name}</p>
        <p className="text-[11px] text-slate-400">{user?.email}</p>
      </div>
      <Button
        variant="outline"
        onClick={signOutHere}
        disabled={pending}
        className="h-8 px-3 text-xs"
      >
        <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
      </Button>
      <Button
        variant="ghost"
        onClick={signOutEverywhere}
        disabled={pending}
        className="h-8 px-3 text-xs"
      >
        Sign out everywhere
      </Button>
    </>
  );
}

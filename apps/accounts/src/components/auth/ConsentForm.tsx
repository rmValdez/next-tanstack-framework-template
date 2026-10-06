"use client";

import { useState } from "react";
import { AlertCircle, AppWindow } from "lucide-react";
import { Button } from "@workspace/ui/button";
import { Card } from "@workspace/ui/card";
import { authClient } from "@/lib/auth-client";

const SCOPE_LABELS: Record<string, string> = {
  openid: "Confirm who you are",
  profile: "See your name and picture",
  email: "See your email address",
  offline_access: "Stay signed in while you're away",
};

interface ConsentFormProps {
  clientName: string;
  clientUri: string | null;
  scopes: string[];
}

export function ConsentForm({ clientName, clientUri, scopes }: ConsentFormProps) {
  const [pending, setPending] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The auth client's oauthProviderClient() attaches this page's signed query, so the
  // server knows which authorization request is being answered. Either answer returns
  // a URL back to the client app (with a code, or with error=access_denied).
  const respond = async (accept: boolean) => {
    setPending(accept ? "accept" : "deny");
    setError(null);

    const { data, error: consentError } = await authClient.$fetch<{ url?: string }>(
      "/oauth2/consent",
      { method: "POST", body: { accept } }
    );

    if (consentError || !data?.url) {
      setError(consentError?.message || "This request has expired. Start again from the app.");
      setPending(null);
      return;
    }

    window.location.href = data.url;
  };

  return (
    <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 backdrop-blur-xl">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 shadow-inner">
          <AppWindow className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          {clientName} wants to access your account
        </h1>
        {clientUri && <p className="mt-1 text-xs text-slate-500">{clientUri}</p>}
      </div>

      {scopes.length > 0 && (
        <ul className="mb-6 space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
          {scopes.map((scope) => (
            <li key={scope}>• {SCOPE_LABELS[scope] ?? scope}</li>
          ))}
        </ul>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="secondary"
          isLoading={pending === "deny"}
          disabled={pending !== null}
          onClick={() => respond(false)}
        >
          Deny
        </Button>
        <Button
          type="button"
          isLoading={pending === "accept"}
          disabled={pending !== null}
          onClick={() => respond(true)}
        >
          Allow
        </Button>
      </div>
    </Card>
  );
}

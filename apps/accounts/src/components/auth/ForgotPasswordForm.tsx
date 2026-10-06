"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, AlertCircle, MailCheck, ArrowLeft } from "lucide-react";
import { Card } from "@workspace/ui/card";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { authClient } from "@/lib/auth-client";
import { isValidEmail } from "@/lib/utils";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsPending(true);

    try {
      const { error: requestError } = await authClient.requestPasswordReset({
        email,
        // Better Auth validates the emailed token, then redirects here with ?token=...
        redirectTo: "/reset-password",
      });

      if (requestError) {
        setError(requestError.message || "Could not send reset email.");
        return;
      }

      // Shown regardless of whether the account exists, so the form cannot be
      // used to discover registered addresses.
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 backdrop-blur-xl">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 shadow-inner">
          {sent ? <MailCheck className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          {sent ? "Check your email" : "Forgot password"}
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          {sent
            ? `If an account exists for ${email}, a reset link is on its way. It expires in 1 hour.`
            : "Enter your account email and we'll send you a reset link"}
        </p>
        {sent && (
          <p className="mt-2 text-xs text-slate-500">
            Running locally? Open Mailpit at http://localhost:5004 to see it.
          </p>
        )}
      </div>

      {error && (
        <div className="animate-in fade-in mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 duration-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!sent && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="operator@domain.com"
          />

          <Button type="submit" fullWidth isLoading={isPending} className="mt-6">
            Send reset link
          </Button>
        </form>
      )}

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-cyan-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>
    </Card>
  );
}

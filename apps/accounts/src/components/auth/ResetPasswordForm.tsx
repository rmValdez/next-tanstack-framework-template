"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LockKeyhole, AlertCircle, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Card } from "@workspace/ui/card";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { authClient } from "@/lib/auth-client";
import { MIN_PASSWORD_LENGTH } from "@workspace/core/env";

interface ResetPasswordFormProps {
  // Null when the link was missing a token or Better Auth rejected it
  // (redirected here with ?error=INVALID_TOKEN).
  token: string | null;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsPending(true);

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (resetError) {
        setError(
          resetError.code === "INVALID_TOKEN"
            ? "This reset link is invalid or has expired. Request a new one."
            : resetError.message || "Could not reset password."
        );
        return;
      }

      toast.success("Password updated. Sign in with your new password.");
      router.push("/login");
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
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">Set a new password</h1>
        <p className="mt-1 text-xs text-slate-400">
          {token
            ? "Choose a new password for your account"
            : "This reset link is invalid or has expired"}
        </p>
      </div>

      {error && (
        <div className="animate-in fade-in mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 duration-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {token ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              label="New Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-[30px] text-slate-400 transition-colors hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Input
            label="Confirm Password"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="••••••••"
          />

          <Button type="submit" fullWidth isLoading={isPending} className="mt-6">
            Update password
          </Button>
        </form>
      ) : (
        <Link href="/forgot-password">
          <Button type="button" fullWidth>
            Request a new link
          </Button>
        </Link>
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

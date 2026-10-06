"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogIn, UserPlus, ShieldCheck, AlertCircle, Eye, EyeOff, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@workspace/ui/card";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { authClient } from "@/lib/auth-client";
import { isValidEmail } from "@/lib/utils";
import { MIN_PASSWORD_LENGTH } from "@workspace/core/env";
import { AUTH_SESSION_QUERY_KEY } from "@/hooks/useAuthSession";

const EMAIL_VERIFIED_PATH = "/email-verified";

interface LoginFormProps {
  // Same-origin path to open after a direct sign-in (validated by the page).
  redirectTo: string;
  // True when a client app's /oauth2/authorize sent the user here; after sign-in the
  // user goes back to that app instead of `redirectTo`.
  isOAuthRequest: boolean;
}

export function LoginForm({ redirectTo, isOAuthRequest }: LoginFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Set once sign-up succeeds: the account exists but has no session until the
  // email is verified (requireEmailVerification in src/lib/auth.ts).
  const [verificationSentTo, setVerificationSentTo] = useState<string | null>(null);
  // Set when sign-in is refused because the address is not yet verified.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const switchMode = (nextMode: "signin" | "signup") => {
    setMode(nextMode);
    setError(null);
    setEmail("");
    setPassword("");
    setName("");
    setShowPassword(false);
    setUnverifiedEmail(null);
  };

  const resendVerification = async (address: string) => {
    setIsResending(true);
    try {
      const { error: resendError } = await authClient.sendVerificationEmail({
        email: address,
        callbackURL: EMAIL_VERIFIED_PATH,
      });

      if (resendError) {
        toast.error(resendError.message || "Could not send verification email.");
        return;
      }

      toast.success("Verification email sent. Check your inbox.");
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let handingOff = false;
    setError(null);
    setUnverifiedEmail(null);

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setIsPending(true);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "User",
          callbackURL: EMAIL_VERIFIED_PATH,
        });

        if (signUpError) {
          setError(signUpError.message || "Failed to create account.");
          return;
        }

        // No session token means verification is required before sign-in.
        if (!data?.token) {
          setVerificationSentTo(email);
          setPassword("");
          return;
        }
      } else {
        const { data, error: signInError } = await authClient.signIn.email({
          email,
          password,
        });

        if (signInError) {
          if (signInError.code === "EMAIL_NOT_VERIFIED") {
            setUnverifiedEmail(email);
            setError("Your email address has not been verified yet.");
          } else if (signInError.message?.includes("invalid_signature")) {
            setError("This sign-in link has expired or was modified. Start again from the app.");
          } else {
            setError(signInError.message || "Invalid credentials.");
          }
          return;
        }

        // Sign-in that started at a client app's /oauth2/authorize: the server resumed
        // the authorization and the auth client is already navigating back to the app.
        // Keep the button busy instead of routing anywhere ourselves.
        if (data?.redirect && data.url) {
          handingOff = true;
          return;
        }
      }

      await queryClient.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
      toast.success(mode === "signup" ? "Account created." : "Signed in.");
      router.push(redirectTo);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      if (!handingOff) setIsPending(false);
    }
  };

  if (verificationSentTo) {
    return (
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 shadow-inner">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Check your email</h1>
          <p className="mt-2 text-sm text-slate-400">
            We sent a verification link to{" "}
            <span className="font-medium text-slate-200">{verificationSentTo}</span>. Open it to
            activate your account — you&apos;ll be signed in automatically.
          </p>
          {isOAuthRequest && (
            // Verification happens in a new tab from the email, which can't resume this
            // app's authorization request; the next "Sign in" in the app is one click.
            <p className="mt-2 text-sm text-slate-400">
              Then go back to the app you came from and sign in again.
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Running locally? Open Mailpit at http://localhost:5004 to see it.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <Button
            type="button"
            variant="outline"
            fullWidth
            isLoading={isResending}
            onClick={() => resendVerification(verificationSentTo)}
          >
            Resend verification email
          </Button>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={() => {
              setVerificationSentTo(null);
              switchMode("signin");
            }}
          >
            Back to sign in
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 backdrop-blur-xl">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 shadow-inner">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          {mode === "signin" ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          {isOAuthRequest
            ? "Sign in with your account to continue to the app"
            : mode === "signin"
              ? "Enter your credentials to access your account"
              : "Create one account for every app"}
        </p>
      </div>

      <div className="mb-6 flex rounded-xl border border-slate-800 bg-slate-950/60 p-1">
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
            mode === "signin"
              ? "border border-cyan-500/30 bg-cyan-500/20 text-cyan-300 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LogIn className="h-3.5 w-3.5" /> Sign In
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
            mode === "signup"
              ? "border border-cyan-500/30 bg-cyan-500/20 text-cyan-300 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <UserPlus className="h-3.5 w-3.5" /> Sign Up
        </button>
      </div>

      {error && (
        <div className="animate-in fade-in mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 duration-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1.5">
            <span>{error}</span>
            {unverifiedEmail && (
              <button
                type="button"
                onClick={() => resendVerification(unverifiedEmail)}
                disabled={isResending}
                className="block font-semibold text-cyan-400 underline-offset-2 hover:underline disabled:opacity-50"
              >
                {isResending ? "Sending..." : "Resend verification email"}
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <Input
            label="Full Name"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
          />
        )}

        <Input
          label="Email Address"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="operator@domain.com"
        />

        <div className="relative">
          <Input
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
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

        {mode === "signin" && (
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-slate-400 transition-colors hover:text-cyan-400"
            >
              Forgot password?
            </Link>
          </div>
        )}

        <Button type="submit" fullWidth isLoading={isPending} className="mt-6">
          {mode === "signin" ? "Sign In" : "Create Account"}
        </Button>
      </form>
    </Card>
  );
}

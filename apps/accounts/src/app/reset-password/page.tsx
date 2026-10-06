import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password | Accounts",
};

// Better Auth's GET /api/auth/reset-password/:token checks the emailed token and
// redirects here with either ?token=... or ?error=INVALID_TOKEN.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}) {
  const { token, error } = await searchParams;
  const validToken = !error && typeof token === "string" && token.length > 0 ? token : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <ResetPasswordForm token={validToken} />
    </div>
  );
}

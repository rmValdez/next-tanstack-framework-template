import { requireAuth } from "@/lib/session";

export default async function ProtectedAccountLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();

  return <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">{children}</div>;
}

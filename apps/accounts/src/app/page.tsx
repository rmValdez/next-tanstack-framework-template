import Link from "next/link";
import { ArrowRight, KeyRound, Lock, Network, ShieldCheck } from "lucide-react";
import { Button } from "@workspace/ui/button";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "One account",
    text: "Sign up once, verify your email, and use the same credentials in every app.",
  },
  {
    icon: Network,
    title: "OpenID Connect",
    text: "Apps sign in through standard OIDC with PKCE. Each keeps its own session and data.",
  },
  {
    icon: KeyRound,
    title: "Self-service",
    text: "Password reset and email verification by link, with rate-limited endpoints.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-20 items-center justify-between border-b border-slate-800/80 bg-slate-950/70 px-6 backdrop-blur-xl md:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20">
            <Lock className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Accounts<span className="text-cyan-400">.</span>
          </span>
        </div>
        <Link href="/login">
          <Button variant="ghost" className="text-xs md:text-sm">
            Sign In
          </Button>
        </Link>
      </header>

      <section className="relative overflow-hidden px-6 pb-20 pt-24 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[350px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Your account for <span className="text-gradient">every app</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-400 sm:text-lg">
            The identity provider for this platform. Apps send you here to sign in and you come
            straight back, already authenticated.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
            <Link href="/account" className="w-full sm:w-auto">
              <Button fullWidth className="h-12 px-8 text-base">
                Manage your account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/api/auth/.well-known/openid-configuration" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                fullWidth
                className="h-12 border border-slate-700 px-8 text-base"
              >
                OIDC discovery
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-6 pb-20 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="glass-card space-y-3 rounded-2xl border border-slate-800 p-6 transition-colors hover:border-cyan-500/40"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-xs leading-relaxed text-slate-400">{text}</p>
          </div>
        ))}
      </section>

      <footer className="mt-auto border-t border-slate-900 px-6 py-8 text-center text-xs text-slate-500">
        <p>Built with Next.js 15, Better Auth, Prisma, and Tailwind CSS.</p>
      </footer>
    </div>
  );
}

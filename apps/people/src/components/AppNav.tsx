"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/cn";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/employees", label: "Employees" },
  { href: "/recruitment", label: "Recruitment" },
  { href: "/attendance", label: "Attendance" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            pathname.startsWith(href)
              ? "bg-slate-800 text-white"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

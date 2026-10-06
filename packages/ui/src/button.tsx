import React, { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  fullWidth?: boolean;
}

export function Button({
  children,
  isLoading,
  variant = "primary",
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary:
      "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/20 active:scale-[0.98]",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium active:scale-[0.98]",
    outline: "border border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/40 active:scale-[0.98]",
    ghost: "text-slate-300 hover:bg-slate-800/60 active:scale-[0.98]",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm transition-all disabled:pointer-events-none disabled:opacity-50",
        variantStyles[variant],
        fullWidth ? "w-full" : "w-auto",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-current" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

"use client";

import { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "border border-[rgba(20,241,197,0.6)] bg-[rgba(20,241,197,0.12)] text-[var(--accent-2)] hover:border-[var(--accent-2)] hover:text-[var(--text)]",
  ghost: "border border-transparent bg-transparent text-[var(--text)] hover:border-[var(--border)]",
  outline:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent-2)]",
  danger:
    "border border-[var(--danger)] bg-[var(--danger)] text-black hover:shadow-[0_0_20px_rgba(255,111,145,0.4)]",
};

export function Button({
  className,
  variant = "outline",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition",
        styles[variant],
        className
      )}
    />
  );
}

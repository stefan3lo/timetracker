"use client";

import { InputHTMLAttributes } from "react";
import { cx } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm focus:border-[var(--accent-2)] focus:outline-none",
        className
      )}
    />
  );
}

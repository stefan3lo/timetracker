"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { cx } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        {...props}
        className={cx(
          "w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm focus:border-[var(--accent-2)] focus:outline-none",
          className
        )}
      />
    );
  }
);

Input.displayName = "Input";

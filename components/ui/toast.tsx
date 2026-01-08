"use client";

import { useEffect } from "react";
import { cx } from "@/lib/utils";

type ToastProps = {
  message: string | null;
  type?: "success" | "error";
  onClose: () => void;
};

export function Toast({ message, type = "success", onClose }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 2400);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      className={cx(
        "fixed bottom-6 right-6 z-50 rounded-2xl border px-4 py-3 text-sm shadow-xl",
        type === "success"
          ? "border-[var(--accent-2)] bg-[rgba(20,241,197,0.12)] text-[var(--text)]"
          : "border-[var(--danger)] bg-[rgba(255,111,145,0.12)] text-[var(--danger)]"
      )}
    >
      {message}
    </div>
  );
}

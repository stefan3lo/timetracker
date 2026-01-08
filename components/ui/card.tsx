"use client";

import { HTMLAttributes } from "react";
import { cx } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx("glass rounded-3xl p-6", className)}
    />
  );
}

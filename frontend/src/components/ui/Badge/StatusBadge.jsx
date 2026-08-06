import React from "react";
import { cn } from "../../../common/utils/cn";

const statusConfig = {
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  info: "bg-info-500",
  neutral: "bg-neutral-400 dark:bg-neutral-600",
};

export default function StatusBadge({ status, label, className }) {
  const dotClass = statusConfig[status] || statusConfig.neutral;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300",
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotClass)} />
      {label}
    </span>
  );
}

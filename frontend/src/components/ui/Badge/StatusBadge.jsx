import React from "react";
import { cn } from "../../../common/utils/cn";
import { CheckCircle, AlertTriangle, Clock, AlertCircle } from "lucide-react";

const statusConfig = {
  success: {
    className: "bg-success-50 dark:bg-success-900/30 text-success-500 dark:text-success-400",
    Icon: CheckCircle,
  },
  warning: {
    className: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
    Icon: AlertTriangle,
  },
  danger: {
    className: "bg-danger-50 dark:bg-danger-900/30 text-danger-500 dark:text-danger-400",
    Icon: AlertCircle,
  },
  info: {
    className: "bg-info-50 dark:bg-info-900/30 text-info-500 dark:text-info-400",
    Icon: Clock,
  },
  neutral: {
    className: "bg-neutral-300 dark:bg-slate-700 text-neutral-800 dark:text-slate-300",
    Icon: Clock,
  },
};

export default function StatusBadge({ status, label, className }) {
  const config = statusConfig[status] || statusConfig.neutral;
  const { className: badgeClasses, Icon } = config;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-2 text-xs font-medium",
        badgeClasses,
        className,
      )}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

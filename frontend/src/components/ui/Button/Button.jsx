import React from "react";
import { cn } from "../../../common/utils/cn";
import { Loader2 } from "lucide-react";

const variants = {
  primary:
    "bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500",
  secondary:
    "bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-200 border border-neutral-500 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-700 focus:ring-neutral-500",
  ghost:
    "bg-transparent text-neutral-800 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 focus:ring-neutral-500",
  danger: "bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-500",
  success:
    "bg-success-500 text-white hover:bg-success-600 focus:ring-success-500",
  info: "bg-info-50 dark:bg-info-900/30 text-info-500 dark:text-info-400 hover:bg-info-100 dark:hover:bg-info-900/50 focus:ring-info-500",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-xs",
  lg: "px-6 py-2.5 text-sm",
};

export default function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = "left",
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-4 font-semibold",
        "transition-colors duration-150 ease-in-out",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {Icon && iconPosition === "left" && <Icon className="w-4 h-4" />}
          {children}
          {Icon && iconPosition === "right" && <Icon className="w-4 h-4" />}
        </>
      )}
    </button>
  );
}

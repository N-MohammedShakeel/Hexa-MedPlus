import React from "react";
import { cn } from "../../../common/utils/cn";

export default function Card({
  children,
  className,
  padding = "md",
  hover = false,
  ...props
}) {
  const paddingClasses = {
    none: "p-0",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-900 border border-neutral-500 dark:border-slate-800 rounded-8 shadow-card",
        paddingClasses[padding],
        hover && "hover:shadow-md transition-shadow duration-200",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

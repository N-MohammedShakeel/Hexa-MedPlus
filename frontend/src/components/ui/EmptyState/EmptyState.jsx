import React from "react";
import { cn } from "../../../common/utils/cn";

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-4", className)}>
      {Icon && <Icon className="w-8 h-8 text-neutral-400 dark:text-neutral-600 mb-3" strokeWidth={1.5} />}
      {title && (
        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{title}</p>
      )}
      {description && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

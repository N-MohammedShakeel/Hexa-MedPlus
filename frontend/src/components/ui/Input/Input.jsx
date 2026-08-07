import React, { forwardRef } from "react";
import { X } from "lucide-react";
import { cn } from "../../../common/utils/cn";

const Input = forwardRef(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      onClear,
      value,
      ...props
    },
    ref,
  ) => {
    // Pass onClear (plus a non-empty value) to get a clickable X that resets the
    // field — used for every free-text search input in the app. Takes priority
    // over a decorative rightIcon while there's something to clear.
    const showClear = !!onClear && !!value;
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-neutral-800 dark:text-slate-300 mb-1.5 tracking-wide">
            {label}
          </label>
        )}
        <div className="relative">
          {LeftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-slate-400">
              <LeftIcon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            value={value}
            className={cn(
              "w-full py-2 bg-white dark:bg-slate-800 border rounded-4 text-sm text-neutral-900 dark:text-slate-200",
              "placeholder:text-gray-500 dark:placeholder:text-slate-500",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              LeftIcon ? "pl-10" : "pl-3",
              (RightIcon || showClear) ? "pr-10" : "pr-3",
              error
                ? "border-danger-500 focus:ring-danger-500"
                : "border-neutral-500 dark:border-slate-700",
              className,
            )}
            {...props}
          />
          {showClear ? (
            <button
              type="button"
              onClick={onClear}
              tabIndex={-1}
              title="Clear"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          ) : RightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-slate-400">
              <RightIcon className="w-4 h-4" />
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-danger-500 dark:text-danger-400">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-neutral-600 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;

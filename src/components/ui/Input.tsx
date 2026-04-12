"use client";

import { InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-[13px] font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            w-full px-3 py-2
            text-[15px] text-text-primary
            bg-bg-surface
            border rounded-md
            placeholder:text-text-muted
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-bg-page
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              error
                ? "border-danger focus:ring-danger/50"
                : "border-border focus:ring-primary/50 focus:border-primary"
            }
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-[13px] text-danger">{error}</p>}
        {hint && !error && (
          <p className="text-[13px] text-text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };

import * as React from "react";
import { cn } from "@/lib/cn";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
};

const fieldBase =
  "block w-full rounded-field border bg-surface px-4 text-[16px] text-ink placeholder:text-ink-muted/70 transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-ink focus:ring-4 focus:ring-ink/10 disabled:opacity-50";

export function Input({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? `in-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink-soft">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
        className={cn(fieldBase, "h-12", error ? "border-danger" : "border-line")}
      />
      {error ? (
        <p id={`${inputId}-err`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Textarea({
  label,
  hint,
  error,
  className,
  id,
  rows = 4,
  ...rest
}: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const inputId = id ?? `ta-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink-soft">
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        {...rest}
        className={cn(fieldBase, "py-3 leading-relaxed", error ? "border-danger" : "border-line")}
      />
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="text-sm text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

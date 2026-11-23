"use client";

import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * One field of an account form: a label that stays in view above the field
 * (a placeholder disappears at the first key press, and takes the password
 * rule with it), an optional hint under the field, and both the hint and the
 * form's error tied to the field, so a screen reader reads them with it.
 */
export function AuthField({
  id,
  label,
  hint,
  errorId,
  invalid = false,
  ...input
}: {
  id: string;
  label: ReactNode;
  /** A rule or a note about the field, shown under it at all times. */
  hint?: ReactNode;
  /** The id of the form's error message, while one is shown. */
  errorId?: string;
  /** Whether the error is about this field's own value. */
  invalid?: boolean;
} & Omit<ComponentProps<"input">, "id">) {
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} {...input} />
      {hint && (
        <p id={hintId} className="text-note text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

/** The form's one error message. It is announced when it appears, and the fields point to it by its id. */
export function FormAlert({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-small text-destructive"
    >
      {children}
    </p>
  );
}

/**
 * What creating an account agrees to, under the button that creates it. The
 * two documents open in a new tab, so nothing typed into the form is lost,
 * and the sentence says so before the link is pressed.
 */
export function TermsNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-note text-muted-foreground ${className}`}>
      By creating an account you accept the{" "}
      <a href="/terms" target="_blank" rel="noopener" className="cb-link">
        terms
      </a>{" "}
      and the{" "}
      <a href="/privacy" target="_blank" rel="noopener" className="cb-link">
        privacy policy
      </a>
      . Each document opens in a new tab.
    </p>
  );
}

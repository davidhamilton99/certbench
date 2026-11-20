import { Fragment, type ReactNode } from "react";

/**
 * Exam codes in big type stay whole. A line may break after any hyphen, so a
 * wrapped heading could read "Security+ (SY0-" / "701) practice test"; each
 * code ("SY0-701", "(N10-009)", "220-1201") is set as one unbreakable piece.
 */
const CODE = /(\(?\b[A-Z0-9]{2,4}-\d{3,4}\)?)/g;

export function keepCodes(text: string): ReactNode {
  const parts = text.split(CODE);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

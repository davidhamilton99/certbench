"use client";

import { useState } from "react";

const TRUNCATE_LENGTH = 300;

export function ExpandableText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > TRUNCATE_LENGTH;

  if (!needsTruncation) {
    return <p className={className}>{text}</p>;
  }

  return (
    <p className={className}>
      {expanded ? text : text.substring(0, TRUNCATE_LENGTH) + "..."}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="ml-1 text-primary hover:underline font-medium"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </p>
  );
}

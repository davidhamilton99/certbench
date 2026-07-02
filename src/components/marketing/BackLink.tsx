"use client";

import { useRouter } from "next/navigation";

export function BackLink() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="mb-8 inline-block text-sm text-primary hover:underline"
    >
      &larr; Back
    </button>
  );
}

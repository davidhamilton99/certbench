"use client";

import { useRouter } from "next/navigation";

export function BackLink() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="text-[13px] text-primary hover:underline mb-8 inline-block"
    >
      &larr; Back
    </button>
  );
}

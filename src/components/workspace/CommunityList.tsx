"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

interface CommunitySet {
  id: string;
  user_id: string;
  title: string;
  category: string | null;
  question_count: number;
  created_at: string;
  creatorName: string;
  bookmarkCount: number;
  isBookmarked: boolean;
}

export function CommunityList({
  sets,
  certName,
  certSlug,
}: {
  sets: CommunitySet[];
  certName: string | null;
  certSlug: string | null;
}) {
  const [bookmarks, setBookmarks] = useState<Map<string, boolean>>(
    new Map(sets.map((s) => [s.id, s.isBookmarked]))
  );
  const [counts, setCounts] = useState<Map<string, number>>(
    new Map(sets.map((s) => [s.id, s.bookmarkCount]))
  );

  const toggleBookmark = useCallback(
    async (setId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const wasBookmarked = bookmarks.get(setId) || false;

      // Optimistic update
      setBookmarks((prev) => new Map(prev).set(setId, !wasBookmarked));
      setCounts((prev) =>
        new Map(prev).set(
          setId,
          (prev.get(setId) || 0) + (wasBookmarked ? -1 : 1)
        )
      );

      try {
        const res = await fetch("/api/community/bookmark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studySetId: setId }),
        });

        if (!res.ok) {
          // Revert on failure
          setBookmarks((prev) => new Map(prev).set(setId, wasBookmarked));
          setCounts((prev) =>
            new Map(prev).set(
              setId,
              (prev.get(setId) || 0) + (wasBookmarked ? 1 : -1)
            )
          );
        }
      } catch {
        // Revert on failure
        setBookmarks((prev) => new Map(prev).set(setId, wasBookmarked));
        setCounts((prev) =>
          new Map(prev).set(
            setId,
            (prev.get(setId) || 0) + (wasBookmarked ? 1 : -1)
          )
        );
      }
    },
    [bookmarks]
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Community Study Sets
        </h1>
        {certName && (
          <p className="text-[15px] text-text-secondary mt-1">
            Sets tagged for {certName}
          </p>
        )}
      </div>

      {sets.length === 0 ? (
        <EmptyState
          title="No community sets yet"
          description={
            certSlug
              ? "No one has shared study sets for this certification yet. Be the first!"
              : "Browse and discover study sets shared by other users."
          }
          actionLabel="Create Study Material"
          actionHref="/study-materials/new"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sets.map((set) => {
            const isBookmarked = bookmarks.get(set.id) || false;
            const count = counts.get(set.id) || 0;

            return (
              <Link
                key={set.id}
                href={`/community/${set.id}`}
              >
                <Card
                  padding="md"
                  className="hover:bg-bg-page transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-[15px] font-semibold text-text-primary">
                        {set.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-text-muted">
                          by {set.creatorName}
                        </span>
                        {set.category && (
                          <span className="text-[13px] text-text-muted">
                            {set.category}
                          </span>
                        )}
                        <span className="text-[13px] font-mono text-text-muted">
                          {set.question_count}q
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => toggleBookmark(set.id, e)}
                        className={`text-[13px] font-medium px-2 py-1 rounded transition-colors ${
                          isBookmarked
                            ? "text-primary bg-blue-50"
                            : "text-text-muted hover:text-text-secondary"
                        }`}
                      >
                        {isBookmarked ? "Saved" : "Save"}{" "}
                        {count > 0 && (
                          <span className="font-mono">({count})</span>
                        )}
                      </button>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

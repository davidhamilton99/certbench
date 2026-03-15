"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CertTag {
  slug: string;
  domain: string | null;
}

interface CommunitySet {
  id: string;
  user_id: string;
  title: string;
  category: string | null;
  question_count: number;
  is_featured: boolean;
  attempt_count: number;
  created_at: string;
  creatorName: string;
  bookmarkCount: number;
  isBookmarked: boolean;
  certTags: CertTag[];
}

interface Certification {
  slug: string;
  name: string;
}

type SortOption = "popular" | "newest" | "most_saved" | "most_questions";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "most_saved", label: "Most Saved" },
  { value: "most_questions", label: "Most Questions" },
];

const PAGE_SIZE = 24;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function certShortName(slug: string): string {
  const map: Record<string, string> = {
    "security-plus": "Security+",
    "network-plus": "Network+",
    "a-plus-core-1": "A+ Core 1",
    "a-plus-core-2": "A+ Core 2",
  };
  return map[slug] || slug;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CommunityList({
  sets,
  certifications,
  activeCertSlug,
  activeCertName,
}: {
  sets: CommunitySet[];
  certifications: Certification[];
  activeCertSlug: string | null;
  activeCertName: string | null;
}) {
  const [bookmarks, setBookmarks] = useState<Map<string, boolean>>(
    new Map(sets.map((s) => [s.id, s.isBookmarked]))
  );
  const [counts, setCounts] = useState<Map<string, number>>(
    new Map(sets.map((s) => [s.id, s.bookmarkCount]))
  );

  // Debounce: track which bookmark toggles are in-flight
  const inflightRef = useRef<Set<string>>(new Set());

  // Filters & search
  const [search, setSearch] = useState("");
  const [certFilter, setCertFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("popular");

  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Filtered and sorted sets
  const filteredSets = useMemo(() => {
    let result = [...sets];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.creatorName.toLowerCase().includes(q) ||
          (s.category && s.category.toLowerCase().includes(q))
      );
    }

    // Cert filter
    if (certFilter !== "all") {
      result = result.filter((s) =>
        s.certTags.some((t) => t.slug === certFilter)
      );
    }

    // Sort
    result.sort((a, b) => {
      // Featured always first
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;

      switch (sort) {
        case "popular":
          if (b.attempt_count !== a.attempt_count)
            return b.attempt_count - a.attempt_count;
          return (
            (counts.get(b.id) || 0) - (counts.get(a.id) || 0) ||
            new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
        case "newest":
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
        case "most_saved":
          return (
            (counts.get(b.id) || 0) - (counts.get(a.id) || 0) ||
            new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
        case "most_questions":
          return (
            b.question_count - a.question_count ||
            new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
        default:
          return 0;
      }
    });

    return result;
  }, [sets, search, certFilter, sort, counts]);

  const paginatedSets = useMemo(
    () => filteredSets.slice(0, visibleCount),
    [filteredSets, visibleCount]
  );
  const hasMore = visibleCount < filteredSets.length;

  const toggleBookmark = useCallback(
    async (setId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Debounce: skip if already in-flight for this set
      if (inflightRef.current.has(setId)) return;
      inflightRef.current.add(setId);

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
          setBookmarks((prev) => new Map(prev).set(setId, wasBookmarked));
          setCounts((prev) =>
            new Map(prev).set(
              setId,
              (prev.get(setId) || 0) + (wasBookmarked ? 1 : -1)
            )
          );
        }
      } catch {
        setBookmarks((prev) => new Map(prev).set(setId, wasBookmarked));
        setCounts((prev) =>
          new Map(prev).set(
            setId,
            (prev.get(setId) || 0) + (wasBookmarked ? 1 : -1)
          )
        );
      } finally {
        inflightRef.current.delete(setId);
      }
    },
    [bookmarks]
  );

  // Reset pagination when filters change
  const handleCertFilter = useCallback((value: string) => {
    setCertFilter(value);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleSort = useCallback((value: SortOption) => {
    setSort(value);
    setVisibleCount(PAGE_SIZE);
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Community Study Sets
        </h1>
        <p className="text-[15px] text-text-secondary mt-1">
          Browse and discover study sets shared by other users.
        </p>
      </div>

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search sets..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Search community study sets"
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-border bg-bg-surface text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Cert filter */}
        <select
          value={certFilter}
          onChange={(e) => handleCertFilter(e.target.value)}
          aria-label="Filter by certification"
          className="h-9 px-3 rounded-lg border border-border bg-bg-surface text-[14px] text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="all">All Certifications</option>
          {certifications.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => handleSort(e.target.value as SortOption)}
          aria-label="Sort study sets"
          className="h-9 px-3 rounded-lg border border-border bg-bg-surface text-[14px] text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Active filter indicator */}
      {(certFilter !== "all" || search.trim()) && (
        <div className="flex items-center gap-2 mb-4 text-[13px] text-text-secondary">
          <span>{filteredSets.length} result{filteredSets.length !== 1 ? "s" : ""}</span>
          {certFilter !== "all" && (
            <button
              onClick={() => handleCertFilter("all")}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-page border border-border hover:bg-bg-surface transition-colors"
            >
              {certifications.find((c) => c.slug === certFilter)?.name || certFilter}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {search.trim() && (
            <button
              onClick={() => handleSearch("")}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-page border border-border hover:bg-bg-surface transition-colors"
            >
              &ldquo;{search.trim()}&rdquo;
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {filteredSets.length === 0 ? (
        sets.length === 0 ? (
          <EmptyState
            title="No community sets yet"
            description="No one has shared study sets yet. Be the first!"
            actionLabel="Create Study Material"
            actionHref="/study-materials/new"
          />
        ) : (
          <EmptyState
            title="No matching sets"
            description="Try adjusting your search or filters."
          />
        )
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {paginatedSets.map((set) => {
              const isBookmarked = bookmarks.get(set.id) || false;
              const count = counts.get(set.id) || 0;
              const isInflight = inflightRef.current.has(set.id);

              return (
                <Link key={set.id} href={`/community/${set.id}`}>
                  <Card
                    padding="md"
                    className="hover:bg-bg-page transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-2">
                          {set.is_featured && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              Featured
                            </span>
                          )}
                          <h3 className="text-[15px] font-semibold text-text-primary truncate">
                            {set.title}
                          </h3>
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] text-text-muted">
                            by {set.creatorName}
                          </span>
                          <span className="text-[13px] text-text-muted">
                            ·
                          </span>
                          <span className="text-[13px] font-mono text-text-muted">
                            {set.question_count}q
                          </span>
                          <span className="text-[13px] text-text-muted">
                            ·
                          </span>
                          <span className="text-[13px] text-text-muted">
                            {timeAgo(set.created_at)}
                          </span>
                          {set.attempt_count > 0 && (
                            <>
                              <span className="text-[13px] text-text-muted">
                                ·
                              </span>
                              <span className="text-[13px] text-text-muted">
                                {set.attempt_count} attempt{set.attempt_count !== 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Tags row */}
                        {(set.certTags.length > 0 || set.category) && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {set.certTags.map((t) => (
                              <Badge key={t.slug} variant="neutral">
                                {certShortName(t.slug)}
                                {t.domain && ` · ${t.domain}`}
                              </Badge>
                            ))}
                            {set.category && (
                              <span className="text-[12px] text-text-muted px-1.5 py-0.5 rounded bg-bg-page border border-border">
                                {set.category}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Save button */}
                      <button
                        onClick={(e) => toggleBookmark(set.id, e)}
                        disabled={isInflight}
                        aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this set"}
                        className={`flex-shrink-0 text-[13px] font-medium px-2.5 py-1 rounded transition-colors disabled:opacity-50 ${
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
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="text-[14px] font-medium text-primary hover:text-primary/80 px-4 py-2 rounded-lg border border-border hover:bg-bg-page transition-colors"
              >
                Load More ({filteredSets.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

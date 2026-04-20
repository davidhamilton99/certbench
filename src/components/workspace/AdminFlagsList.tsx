"use client";

import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";

interface FlagEntry {
  id: string;
  reason: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  profiles: { display_name: string | null; email: string | null } | null;
  cert_questions: { question_text: string; difficulty: string } | null;
}

interface FlagsResponse {
  flags: FlagEntry[];
  total: number;
}

type StatusFilter = "pending" | "actioned" | "dismissed" | "all";

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: "Pending", value: "pending" },
  { label: "Actioned", value: "actioned" },
  { label: "Dismissed", value: "dismissed" },
  { label: "All", value: "all" },
];

const PER_PAGE = 25;
const flagsKey = (status: StatusFilter, page: number) =>
  ["admin-flags", status, page] as const;

export function AdminFlagsList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("pending");
  const queryClient = useQueryClient();

  // Paginated read — keepPreviousData keeps the current page visible
  // during the next-page fetch instead of snapping to a spinner.
  const { data, isPending } = useQuery({
    queryKey: flagsKey(status, page),
    queryFn: ({ signal }) =>
      api.get<FlagsResponse>("/api/admin/flags", {
        params: { status, page },
        signal,
      }),
    placeholderData: keepPreviousData,
  });

  const flags = data?.flags ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);

  // Status update — on success we invalidate every admin-flags page so
  // any cached tab the user navigates to will refetch.
  const updateFlag = useMutation({
    mutationFn: (vars: { flagId: string; status: "actioned" | "dismissed" }) =>
      api.patch("/api/admin/flags", { body: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flags"] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
              status === tab.value
                ? "bg-bg-surface border border-border text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading (only on first load — page changes use placeholderData) */}
      {isPending && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!isPending && flags.length === 0 && (
        <Card padding="lg">
          <p className="text-[14px] text-text-muted text-center py-4">
            No {status === "all" ? "" : status} flags found.
          </p>
        </Card>
      )}

      {/* Flag list */}
      {!isPending && flags.length > 0 && (
        <div className="flex flex-col gap-3">
          {flags.map((flag) => {
            const userName =
              flag.profiles?.display_name ||
              flag.profiles?.email ||
              "Unknown user";
            const questionText =
              flag.cert_questions?.question_text || "Question deleted";
            const date = new Date(flag.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            const isUpdatingThisFlag =
              updateFlag.isPending &&
              updateFlag.variables?.flagId === flag.id;

            return (
              <Card key={flag.id} padding="md">
                <div className="flex flex-col gap-2">
                  {/* Question text */}
                  <p className="text-[14px] text-text-primary leading-relaxed">
                    {questionText.length > 300
                      ? questionText.substring(0, 300) + "..."
                      : questionText}
                  </p>

                  {/* Reason */}
                  {flag.reason ? (
                    <p className="text-[13px] text-text-secondary">
                      <span className="font-mono text-text-muted text-[11px] uppercase mr-2">
                        Reason
                      </span>
                      {flag.reason}
                    </p>
                  ) : (
                    <p className="text-[12px] text-text-muted font-mono">
                      No reason provided
                    </p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-mono text-text-muted">
                        {userName}
                      </span>
                      <span className="text-[12px] font-mono text-text-muted">
                        {date}
                      </span>
                      <span className="text-[11px] font-mono text-text-muted uppercase">
                        {flag.status}
                      </span>
                    </div>

                    {/* Actions */}
                    {flag.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateFlag.mutate({
                              flagId: flag.id,
                              status: "dismissed",
                            })
                          }
                          disabled={isUpdatingThisFlag}
                        >
                          Dismiss
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            updateFlag.mutate({
                              flagId: flag.id,
                              status: "actioned",
                            })
                          }
                          disabled={isUpdatingThisFlag}
                        >
                          Action
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isPending && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-[12px] font-mono text-text-muted">
            Page {page} of {totalPages} · {total} flags
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

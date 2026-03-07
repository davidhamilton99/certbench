import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Community — CertBench",
};

export default function CommunityPage() {
  return (
    <div>
      <h1 className="text-[24px] font-semibold text-text-primary tracking-tight mb-8">
        Community Study Sets
      </h1>
      <EmptyState
        title="Coming soon"
        description="Discover study sets shared by other users preparing for the same certification."
      />
    </div>
  );
}

import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Study Materials — CertBench",
};

export default function StudyMaterialsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          My Study Materials
        </h1>
      </div>
      <EmptyState
        title="No study materials yet"
        description="Paste your notes, textbook excerpts, or any study content and we'll generate practice questions from it."
        actionLabel="Create New"
        actionHref="/study-materials/new"
      />
    </div>
  );
}

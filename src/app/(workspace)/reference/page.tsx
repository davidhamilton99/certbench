import { referenceRegistry } from "@/data/reference";
import { ReferenceTableViewer } from "@/components/workspace/ReferenceTableViewer";

export default async function ReferencePage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>;
}) {
  const { cert } = await searchParams;
  const certSlug = cert || "";
  const tables = referenceRegistry[certSlug] || null;

  if (!tables) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Reference Tables
        </h1>
        <p className="text-[15px] text-text-secondary">
          {certSlug
            ? "No reference tables available for this certification yet."
            : "Select a certification from the sidebar to view reference tables."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Reference Tables
        </h1>
        <p className="text-[15px] text-text-secondary mt-1">
          Quick lookup for key exam topics. Search across all tables.
        </p>
      </div>
      <ReferenceTableViewer tables={tables} />
    </div>
  );
}

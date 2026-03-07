import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "New Study Material — CertBench",
};

export default function NewStudyMaterialPage() {
  return (
    <div>
      <h1 className="text-[24px] font-semibold text-text-primary tracking-tight mb-8">
        Create Study Material
      </h1>
      <Card padding="lg">
        <p className="text-[15px] text-text-secondary">
          Study material creation with AI-generated questions will be available
          in Phase 5.
        </p>
      </Card>
    </div>
  );
}

import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/server/supabase/server";
import { listActiveCertifications } from "@/server/data/certifications";
import { getProfile } from "@/server/data/profiles";
import { OnboardingForm } from "@/components/auth/OnboardingForm";

export const metadata = {
  title: "Get started",
};

export default async function OnboardingPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const [profile, certifications] = await Promise.all([
    getProfile(db, user.id),
    listActiveCertifications(db),
  ]);
  if (profile?.onboardingCompleted) redirect("/dashboard");

  return (
    <Card className="max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-lg">Which exam are you studying for?</CardTitle>
        <CardDescription>
          You can add more certifications later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OnboardingForm
          certifications={certifications.map((c) => ({
            id: c.id,
            name: c.name,
            examCode: c.examCode,
          }))}
        />
      </CardContent>
    </Card>
  );
}

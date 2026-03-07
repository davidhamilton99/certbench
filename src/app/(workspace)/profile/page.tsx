import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const metadata = {
  title: "Profile — CertBench",
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <h1 className="text-[24px] font-semibold text-text-primary tracking-tight mb-8">
        Profile
      </h1>
      <Card padding="lg">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[13px] text-text-muted uppercase tracking-wider font-medium">
              Display Name
            </p>
            <p className="text-[15px] text-text-primary mt-1">
              {profile?.display_name || "—"}
            </p>
          </div>
          <div>
            <p className="text-[13px] text-text-muted uppercase tracking-wider font-medium">
              Email
            </p>
            <p className="text-[15px] text-text-primary mt-1">{user.email}</p>
          </div>
          <div>
            <p className="text-[13px] text-text-muted uppercase tracking-wider font-medium">
              Member Since
            </p>
            <p className="text-[15px] text-text-primary mt-1 font-mono">
              {new Date(profile?.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Card>
      <div className="mt-8">
        <SignOutButton />
      </div>
    </div>
  );
}

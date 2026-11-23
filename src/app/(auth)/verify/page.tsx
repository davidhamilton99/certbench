import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Verify email",
};

export default function VerifyPage() {
  return (
    <AuthCard
      title="Please check your inbox"
      description="A verification link has been sent to your email address. Open the link to activate your account, and then sign in."
    >
      <div className="flex flex-col gap-3 text-center">
        <Button asChild>
          <Link href="/login">Continue to sign in</Link>
        </Button>
        <p className="text-note text-muted-foreground">
          If the email has not arrived, please check your spam folder. You can also register again with the same email
          address to have the link sent again.
        </p>
      </div>
    </AuthCard>
  );
}

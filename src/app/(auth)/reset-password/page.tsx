import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Set new password",
};

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Set a new password" description="Choose a strong password that you will remember.">
      <ResetPasswordForm />
    </AuthCard>
  );
}

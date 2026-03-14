import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Set New Password — CertBench",
};

export default function ResetPasswordPage() {
  return (
    <>
      <h2 className="text-[18px] font-semibold text-text-primary text-center mb-2">
        Set a new password
      </h2>
      <p className="text-[13px] text-text-muted text-center mb-6">
        Choose a strong password for your account.
      </p>
      <ResetPasswordForm />
    </>
  );
}

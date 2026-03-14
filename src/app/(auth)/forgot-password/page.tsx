import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Reset Password — CertBench",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <h2 className="text-[18px] font-semibold text-text-primary text-center mb-2">
        Reset your password
      </h2>
      <p className="text-[13px] text-text-muted text-center mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <ForgotPasswordForm />
    </>
  );
}

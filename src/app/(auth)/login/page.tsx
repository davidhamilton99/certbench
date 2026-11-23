import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthCard title="Sign in to CertBench" description="Sign in to continue your study path.">
      <LoginForm />
    </AuthCard>
  );
}

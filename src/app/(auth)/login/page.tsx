import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In — CertBench",
};

export default function LoginPage() {
  return (
    <>
      <h2 className="text-[18px] font-semibold text-text-primary text-center mb-6">
        Sign in to CertBench
      </h2>
      <LoginForm />
    </>
  );
}

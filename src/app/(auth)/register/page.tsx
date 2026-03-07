import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create Account — CertBench",
};

export default function RegisterPage() {
  return (
    <>
      <h2 className="text-[18px] font-semibold text-text-primary text-center mb-6">
        Create your account
      </h2>
      <RegisterForm />
    </>
  );
}

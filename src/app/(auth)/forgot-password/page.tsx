import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Reset password",
};

export default function ForgotPasswordPage() {
  return (
    <Card className="mx-auto w-full max-w-[26rem] rounded-[1.75rem] py-8">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold tracking-[-0.03em]">Reset your password</CardTitle>
        <CardDescription>
          We&apos;ll email you a link to set a new one
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}

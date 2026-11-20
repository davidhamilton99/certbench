import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Set new password",
};

export default function ResetPasswordPage() {
  return (
    <Card className="mx-auto w-full max-w-[26rem] rounded-[1.75rem] py-8">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold tracking-[-0.03em]">Set a new password</CardTitle>
        <CardDescription>Choose a strong password you&apos;ll remember</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}

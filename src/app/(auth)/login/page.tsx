import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <Card className="mx-auto w-full max-w-[26rem] rounded-[1.75rem] py-8">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-semibold tracking-[-0.035em]">
          Welcome back
        </CardTitle>
        <CardDescription>Sign in to pick up your plan</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}

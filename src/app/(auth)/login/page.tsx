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
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-lg">Welcome back</CardTitle>
        <CardDescription>Sign in to continue studying</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}

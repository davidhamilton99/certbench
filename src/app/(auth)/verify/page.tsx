import Link from "next/link";
import { MailCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Verify email",
};

export default function VerifyPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <MailCheck className="mb-2 size-8 text-primary" />
        <CardTitle className="text-lg">Check your inbox</CardTitle>
        <CardDescription>
          We sent you a verification link. Click it to activate your account,
          then sign in.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-center">
        <Button asChild>
          <Link href="/login">Go to sign in</Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Nothing arrived? Check spam, or register again with the same email to
          resend the link.
        </p>
      </CardContent>
    </Card>
  );
}

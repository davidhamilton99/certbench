import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        This page doesn&apos;t exist
      </h1>
      <Button asChild variant="outline">
        <Link href="/">Back to CertBench</Link>
      </Button>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="text-[48px] font-bold font-mono text-text-muted">404</p>
        <h1 className="text-[24px] font-bold text-text-primary tracking-tight mt-2 mb-2">
          Page not found
        </h1>
        <p className="text-[15px] text-text-secondary mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}

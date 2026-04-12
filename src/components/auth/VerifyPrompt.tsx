"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function VerifyPrompt() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email_confirmed_at) {
        // Check if onboarding is completed
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        if (profile?.onboarding_completed) {
          router.push("/dashboard");
        } else {
          router.push("/onboarding");
        }
        return;
      }

      setChecking(false);
    }

    checkSession();

    // Listen for auth state changes (email verification callback)
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        checkSession();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (checking) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        <p className="text-[15px] text-text-secondary">
          Checking verification status...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-info-bg flex items-center justify-center">
        <svg
          className="w-6 h-6 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h2 className="text-[18px] font-semibold text-text-primary">
        Check your email
      </h2>
      <p className="text-[15px] text-text-secondary max-w-sm">
        We sent a verification link to your email address. Click it to verify
        your account and get started.
      </p>
      <p className="text-[13px] text-text-muted mt-4">
        Didn&apos;t receive it? Check your spam folder or{" "}
        <a href="/register" className="text-primary hover:underline">
          try again
        </a>
        .
      </p>
    </div>
  );
}

import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: "user" | "admin";
  onboardingCompleted: boolean;
}

export async function getProfile(db: Db, userId: string): Promise<Profile | null> {
  const { data, error } = await db
    .from("profiles")
    .select("id, display_name, avatar_url, role, onboarding_completed")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new ApiError("internal", error.message);
  if (!data) return null;
  return {
    id: data.id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    role: data.role,
    onboardingCompleted: data.onboarding_completed,
  };
}

export async function updateProfile(
  db: Db,
  userId: string,
  patch: { displayName?: string; onboardingCompleted?: boolean }
): Promise<void> {
  const { error } = await db
    .from("profiles")
    .update({
      ...(patch.displayName !== undefined && { display_name: patch.displayName }),
      ...(patch.onboardingCompleted !== undefined && {
        onboarding_completed: patch.onboardingCompleted,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw new ApiError("internal", error.message);
}

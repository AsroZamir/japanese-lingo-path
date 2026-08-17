import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string;
  initials: string;
  avatarUrl: string | null;
  nativeLanguage: string;
};

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  return initials || "?";
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, native_language")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    console.warn(`[current-user] no profiles row for user ${user.id}, falling back to auth metadata`, error);
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaName = typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : undefined;
  const metaAvatar = typeof metadata.avatar_url === "string" ? metadata.avatar_url : typeof metadata.picture === "string" ? metadata.picture : undefined;

  const name = profile?.display_name || metaName || user.email?.split("@")[0] || "Learner";

  return {
    id: user.id,
    email: user.email ?? null,
    name,
    initials: initialsFrom(name),
    avatarUrl: profile?.avatar_url ?? metaAvatar ?? null,
    nativeLanguage: profile?.native_language ?? "Indonesian",
  };
});

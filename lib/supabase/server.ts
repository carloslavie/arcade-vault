import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";

import type { User } from "@/components/user-provider";
import type { Database } from "@/lib/supabase/database.types";

export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which can't set cookies.
            // Safe to ignore: proxy.ts refreshes the session on every request.
          }
        },
      },
    },
  );
}

// null if there is no session or the profile doesn't exist.
// cache(): the layout and the page share one lookup per request.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) return null;

    return { id: user.id, name: profile.username };
  } catch (error) {
    // Let Next.js internal errors through (e.g. the dynamic-rendering bailout from cookies())
    unstable_rethrow(error);
    // Missing env vars or network failure: render as guest instead of crashing
    console.error("getCurrentUser failed:", error);
    return null;
  }
});

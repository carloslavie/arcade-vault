"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useTransition } from "react";

import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/client";

export type User = { id: string; name: string }; // name = profiles.username

type UserContextValue = {
  user: User | null;
  logout: () => void;
};

const UserContext = createContext<UserContextValue | null>(null);

// The user comes from the server (root layout), so the first render already matches the session
export function UserProvider({
  initialUser,
  children,
}: {
  initialUser: User | null;
  children: React.ReactNode;
}) {
  const user = initialUser;
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Session changed in another tab: re-render the server tree to pick up the new user
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return; // Missing env vars: stay as guest
    }

    const refreshIfChanged = (sessionUserId: string | null) => {
      if (sessionUserId !== (user?.id ?? null)) router.refresh();
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
      refreshIfChanged(session?.user.id ?? null);
    });

    // A server-side sign-out elsewhere deletes the cookie without emitting SIGNED_OUT here,
    // so compare again whenever the tab becomes visible
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase.auth.getSession();
      refreshIfChanged(data.session?.user.id ?? null);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.id, router]);

  // Stays on the current page; signOut revalidates the layout so the Nav updates
  const logout = () => startTransition(() => signOut());

  return (
    <UserContext.Provider value={{ user, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}

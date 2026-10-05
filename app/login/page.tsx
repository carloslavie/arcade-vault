import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Iniciar Sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Already signed in: nothing to do here
  if (await getCurrentUser()) redirect("/games");

  // Landing sign-up CTAs link to /login?mode=register
  const { mode } = await searchParams;
  return <AuthForm initialTab={mode === "register" ? "up" : "in"} />;
}

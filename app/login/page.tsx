import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Iniciar Sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Landing sign-up CTAs link to /login?mode=register
  const { mode } = await searchParams;
  return <AuthForm initialTab={mode === "register" ? "up" : "in"} />;
}

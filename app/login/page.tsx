import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Iniciar Sesión" };

export default function LoginPage() {
  return <AuthForm />;
}

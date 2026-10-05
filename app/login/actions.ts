"use server";

import type { AuthError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  validateSignIn,
  validateSignUp,
  type AuthErrorCode,
  type AuthState,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const field = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

// Never log the password: only the error's code and message
function unknownError(where: string, error: unknown): AuthState {
  const detail =
    error instanceof Error
      ? `${(error as Partial<AuthError>).code ?? error.name}: ${error.message}`
      : error;
  console.error(`[auth] ${where} failed:`, detail);
  return { status: "error", code: "unknown" };
}

function signUpErrorCode(error: AuthError): AuthErrorCode | null {
  if (error.code === "user_already_exists" || error.code === "email_exists")
    return "email_taken";
  if (error.code === "weak_password") return "weak_password";
  // The on_auth_user_created trigger failed (username taken in a race); the whole insert rolls back
  if (error.message.includes("Database error saving new user"))
    return "username_taken";
  return null;
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const input = validateSignIn({
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  if (!input) return { status: "error", code: "invalid" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(input);
    if (error) {
      if (error.code === "invalid_credentials") {
        return { status: "error", code: "invalid_credentials" };
      }
      return unknownError("signIn", error);
    }
  } catch (error) {
    return unknownError("signIn", error);
  }

  // redirect() throws, so it must stay outside the try/catch
  revalidatePath("/", "layout");
  redirect("/games");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const input = validateSignUp({
    username: field(formData, "username"),
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  if (!input) return { status: "error", code: "invalid" };

  try {
    const supabase = await createClient();

    // Check first so the normal case never creates an orphan auth user
    const { data: existing, error: lookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", input.username)
      .maybeSingle();
    if (lookupError) return unknownError("signUp lookup", lookupError);
    if (existing) return { status: "error", code: "username_taken" };

    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { username: input.username } },
    });
    if (error) {
      const code = signUpErrorCode(error);
      return code ? { status: "error", code } : unknownError("signUp", error);
    }
  } catch (error) {
    return unknownError("signUp", error);
  }

  revalidatePath("/", "layout");
  redirect("/games");
}

export async function signOut(redirectTo?: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) unknownError("signOut", error);
  } catch (error) {
    unknownError("signOut", error);
  }

  revalidatePath("/", "layout");
  // Only same-site paths: this action is callable by anyone, so avoid an open redirect
  if (redirectTo?.startsWith("/") && !redirectTo.startsWith("//"))
    redirect(redirectTo);
}

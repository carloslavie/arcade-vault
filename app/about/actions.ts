"use server";

import { Resend } from "resend";
import { validateContact, type ContactState } from "@/lib/contact";

const field = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const input = validateContact({
    name: field(formData, "name"),
    email: field(formData, "email"),
    msg: field(formData, "msg"),
  });

  // Honeypot filled: pretend it worked so bots get no signal
  if (field(formData, "website")) {
    return { status: "ok", name: input?.name ?? field(formData, "name").trim() };
  }

  if (!input) return { status: "error", code: "invalid" };

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.error("[contact] Missing env: RESEND_API_KEY, CONTACT_TO_EMAIL or CONTACT_FROM_EMAIL");
    return { status: "error", code: "send_failed" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: input.email,
      subject: `[ARCADE VAULT] Mensaje de ${input.name}`,
      text: `Nombre: ${input.name}\nCorreo: ${input.email}\n\n${input.msg}`,
    });
    if (error) {
      console.error("[contact] Resend error:", error.name, error.message);
      return { status: "error", code: "send_failed" };
    }
  } catch (err) {
    console.error("[contact] Resend threw:", err instanceof Error ? err.message : err);
    return { status: "error", code: "send_failed" };
  }

  return { status: "ok", name: input.name };
}

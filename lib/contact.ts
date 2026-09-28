// Contact form types and validation, shared by the client form and the Server Action

export interface ContactInput { name: string; email: string; msg: string }

export const CONTACT_LIMITS = { name: 60, email: 254, msg: 2000 } as const;

export type ContactErrorCode = "invalid" | "send_failed";

export type ContactState =
  | { status: "idle" }
  | { status: "ok"; name: string }
  | { status: "error"; code: ContactErrorCode };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns the trimmed input, or null if any field is empty, too long or the email is malformed
export function validateContact(input: ContactInput): ContactInput | null {
  const name = input.name.trim();
  const email = input.email.trim();
  const msg = input.msg.trim();

  if (!name || !email || !msg) return null;
  if (name.length > CONTACT_LIMITS.name) return null;
  if (email.length > CONTACT_LIMITS.email) return null;
  if (msg.length > CONTACT_LIMITS.msg) return null;
  if (!EMAIL_RE.test(email)) return null;

  return { name, email, msg };
}

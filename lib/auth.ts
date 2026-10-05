// Auth form types and validation, shared by the client form and the Server Actions

export const AUTH_LIMITS = {
  username: { min: 3, max: 10 },
  email: 254,
  password: { min: 6, max: 72 },
} as const;

export const USERNAME_RE = /^[A-Z0-9_]{3,10}$/;

export type AuthErrorCode =
  | "invalid" // local validation
  | "invalid_credentials"
  | "username_taken"
  | "email_taken"
  | "weak_password"
  | "unknown";

export type AuthState =
  { status: "idle" } | { status: "error"; code: AuthErrorCode };

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  username: string;
  email: string;
  password: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validEmail(email: string) {
  return email.length <= AUTH_LIMITS.email && EMAIL_RE.test(email);
}

// The password is never trimmed: spaces are valid characters
function validPassword(password: string) {
  return (
    password.length >= AUTH_LIMITS.password.min &&
    password.length <= AUTH_LIMITS.password.max
  );
}

// Returns the normalized input (trimmed email), or null if invalid
export function validateSignIn(input: SignInInput): SignInInput | null {
  const email = input.email.trim();
  const { password } = input;

  if (!validEmail(email) || !validPassword(password)) return null;

  return { email, password };
}

// Returns the normalized input (trimmed; username uppercased), or null if invalid
export function validateSignUp(input: SignUpInput): SignUpInput | null {
  const username = input.username.trim().toUpperCase();
  const email = input.email.trim();
  const { password } = input;

  if (!USERNAME_RE.test(username)) return null;
  if (!validEmail(email) || !validPassword(password)) return null;

  return { username, email, password };
}

"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

const USER_KEY = "av_user";

export type User = { name: string };

type UserContextValue = {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextValue | null>(null);

// Tiny external store over localStorage, read via useSyncExternalStore
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedUser: User | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// Must return the same object while the stored value is unchanged
function getSnapshot(): User | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(USER_KEY);
  } catch {}
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedUser = raw ? (JSON.parse(raw) as User) : null;
    } catch {
      cachedUser = null;
    }
  }
  return cachedUser;
}

// Server and hydration render as guest, so the markup always matches
function getServerSnapshot(): User | null {
  return null;
}

function writeUser(user: User | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {}
  listeners.forEach((l) => l());
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const login = (u: User) => writeUser(u);
  const logout = () => writeUser(null);

  return <UserContext.Provider value={{ user, login, logout }}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}

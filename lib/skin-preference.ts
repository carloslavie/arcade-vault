// Skin chosen per game, kept in localStorage. Client-only, no React.
import { DEFAULT_SKIN, isSkinId, type SkinId } from "@/lib/engines/skins";

const PREFIX = "av:skin:v1:";

// Fallback when localStorage is unavailable (private mode, quota)
const memory = new Map<string, SkinId>();
const listeners = new Set<() => void>();

export function readSkin(gameId: string): SkinId {
  try {
    const stored = localStorage.getItem(PREFIX + gameId);
    if (isSkinId(stored)) return stored;
  } catch {
    // Storage blocked: fall through to memory
  }
  return memory.get(gameId) ?? DEFAULT_SKIN;
}

export function writeSkin(gameId: string, id: SkinId): void {
  memory.set(gameId, id);
  try {
    localStorage.setItem(PREFIX + gameId, id);
  } catch {
    // Storage blocked: the choice lasts while the tab is open
  }
  listeners.forEach((listener) => listener());
}

export function subscribeSkin(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(PREFIX)) callback();
  };
  listeners.add(callback);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

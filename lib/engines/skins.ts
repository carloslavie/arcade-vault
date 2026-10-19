// Cosmetic skins shared by every engine. No browser code here, so the server can import it.
export const SKIN_IDS = ["clasico", "neon", "retro"] as const;

export type SkinId = (typeof SKIN_IDS)[number];

export const DEFAULT_SKIN: SkinId = "clasico";

export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};

export function isSkinId(value: unknown): value is SkinId {
  return (
    typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value)
  );
}

// Fixed hex, or a `:root` CSS variable with a fallback.
export type SkinColor = string | { cssVar: string; fallback: string };

// Base skin per engine; engines may extend it with their own render fields.
export type SkinDef<K extends string> = {
  colors: Record<K, SkinColor>;
  glow: number; // canvas shadowBlur
};

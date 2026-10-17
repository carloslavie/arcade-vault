import type { SkinColor } from "./skins";

// Resolves a skin's colors to final values. Client-only (reads :root).
export function resolveColors<K extends string>(
  colors: Record<K, SkinColor>,
): Record<K, string> {
  const css = getComputedStyle(document.documentElement);
  const out = {} as Record<K, string>;
  for (const key of Object.keys(colors) as K[]) {
    const color = colors[key];
    out[key] =
      typeof color === "string"
        ? color
        : css.getPropertyValue(color.cssVar).trim() || color.fallback;
  }
  return out;
}

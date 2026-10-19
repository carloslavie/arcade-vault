// Canvas skins for Snake (SPEC 16). Cosmetic only: same board, sizes and rules.
import type { SkinDef, SkinId } from "@/lib/engines/skins";

import type { Palette } from "./entities";

export type SnakeSkin = SkinDef<keyof Palette> & {
  gridAlpha: number; // 0 = no grid
  fruitStyle: "sprite" | "tint"; // full-color atlas or a one-tone silhouette
};

export const SNAKE_SKINS: Record<SkinId, SnakeSkin> = {
  // Block arcade snake: light blocks on black, no grid or glow
  clasico: {
    colors: {
      background: "#000000",
      grid: "#ffffff",
      body: "#a8a8a8",
      head: "#ffffff",
      fruit: "#ff3b30",
    },
    glow: 0,
    gridAlpha: 0,
    fruitStyle: "sprite",
  },
  // Platform neon, identical to the pre-skins render
  neon: {
    colors: {
      background: "#000000",
      grid: { cssVar: "--green", fallback: "#00ff88" },
      body: { cssVar: "--green", fallback: "#00ff88" },
      head: { cssVar: "--ink", fallback: "#e6e9ff" },
      fruit: { cssVar: "--magenta", fallback: "#ff006e" },
    },
    glow: 10,
    gridAlpha: 0.08,
    fruitStyle: "sprite",
  },
  // 4-tone monochrome LCD, tinted fruit silhouettes
  retro: {
    colors: {
      background: "#c4cfa1",
      grid: "#8b9c6b",
      body: "#4d5b37",
      head: "#1f2a14",
      fruit: "#1f2a14",
    },
    glow: 0,
    gridAlpha: 0.4,
    fruitStyle: "tint",
  },
};

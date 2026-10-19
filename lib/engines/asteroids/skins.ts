// Canvas skins for Asteroids (SPEC 14). Cosmetic only: same shapes, sizes and rules.
import type { SkinDef, SkinId } from "@/lib/engines/skins";

import type { Palette } from "./entities";

export type AsteroidsSkin = SkinDef<keyof Palette> & {
  particleGlow: number; // shadowBlur for explosion particles
};

export const ASTEROIDS_SKINS: Record<SkinId, AsteroidsSkin> = {
  // Vector monitor from game.js: white ship, dimmer rocks, no glow
  clasico: {
    colors: {
      background: "#000000",
      ship: "#ffffff",
      flame: "#ff8200",
      bullet: "#ffe9a8",
      asteroid: "#bdbdbd",
      powerUp: "#00ffff",
    },
    glow: 0,
    particleGlow: 0,
  },
  // Platform neon, identical to the pre-skins render
  neon: {
    colors: {
      background: "#000000",
      ship: { cssVar: "--cyan", fallback: "#00f5ff" },
      flame: { cssVar: "--yellow", fallback: "#f5ff00" },
      bullet: { cssVar: "--yellow", fallback: "#f5ff00" },
      asteroid: { cssVar: "--magenta", fallback: "#ff006e" },
      powerUp: { cssVar: "--green", fallback: "#00ff88" },
    },
    glow: 10,
    particleGlow: 4,
  },
  // Green P1 phosphor: 5 tones of one hue
  retro: {
    colors: {
      background: "#031a09",
      ship: "#d4ffdc",
      flame: "#1f8a3a",
      bullet: "#d4ffdc",
      asteroid: "#33cc55",
      powerUp: "#7dff9a",
    },
    glow: 4,
    particleGlow: 0,
  },
};

// Canvas skins for Arkanoid (SPEC 15). Cosmetic only: same shapes, sizes and rules.
import type { SkinColor, SkinDef, SkinId } from "@/lib/engines/skins";

import type { BlockStyle, Palette } from "./entities";
import type { BlockColor } from "./levels";

export type ArkanoidSkin = SkinDef<Exclude<keyof Palette, "blocks">> &
  BlockStyle & {
    blocks: Record<BlockColor, SkinColor>;
  };

export const ARKANOID_SKINS: Record<SkinId, ArkanoidSkin> = {
  // Arcade bricks on black: solid blocks with bevel, silver paddle, no glow
  clasico: {
    colors: {
      background: "#000000",
      paddle: "#c8ccd6",
      paddleTrim: "#c02020",
      ball: "#ffffff",
      highlight: "rgba(255,255,255,0.3)",
      shade: "rgba(0,0,0,0.35)",
    },
    blocks: {
      red: "#e03030",
      yellow: "#f0d000",
      cyan: "#00c8e0",
      magenta: "#c040d0",
      hotpink: "#f070b0",
      green: "#30c040",
      gray: "#a0a0a8",
    },
    glow: 0,
    highlightHeight: 3,
    bevel: 3,
  },
  // Platform neon, the pre-skins render plus magenta paddle trims
  neon: {
    colors: {
      background: "#000000",
      paddle: { cssVar: "--cyan", fallback: "#00f5ff" },
      paddleTrim: { cssVar: "--magenta", fallback: "#ff006e" },
      ball: { cssVar: "--ink", fallback: "#e6e9ff" },
      highlight: "rgba(255,255,255,0.18)",
      shade: "rgba(0,0,0,0.35)",
    },
    blocks: {
      red: "#ff3b3b",
      yellow: { cssVar: "--yellow", fallback: "#f5ff00" },
      cyan: { cssVar: "--cyan", fallback: "#00f5ff" },
      magenta: { cssVar: "--magenta", fallback: "#ff006e" },
      hotpink: "#ff5ec8",
      green: { cssVar: "--green", fallback: "#00ff88" },
      gray: "#9aa7b8",
    },
    glow: 10,
    highlightHeight: 4,
    bevel: 0,
  },
  // Amber phosphor: 6 tones of one hue, no highlight or bevel
  retro: {
    colors: {
      background: "#140a00",
      paddle: "#ffe8b0",
      paddleTrim: "#b86800",
      ball: "#ffe8b0",
      highlight: "rgba(255,232,176,0.3)",
      shade: "rgba(0,0,0,0.35)",
    },
    blocks: {
      red: "#b86800",
      yellow: "#ffb000",
      cyan: "#e08800",
      magenta: "#b86800",
      hotpink: "#9a5400",
      green: "#e08800",
      gray: "#9a5400",
    },
    glow: 3,
    highlightHeight: 0,
    bevel: 0,
  },
};

// Canvas skins for Tetris (SPEC 17). Cosmetic only: same board, pieces and rules.
import type { SkinColor, SkinDef, SkinId } from "@/lib/engines/skins";

import type { BlockMark, Palette, PieceName } from "./entities";

export type TetrisSkin = SkinDef<Exclude<keyof Palette, "pieces">> & {
  pieces: Record<PieceName, SkinColor>;
  marks: Record<PieceName, BlockMark>;
  gridAlpha: number;
  frameAlpha: number; // board border and next box
  ghostAlpha: number;
  highlightHeight: number; // px, 0 = no highlight
};

const NO_MARKS: Record<PieceName, BlockMark> = {
  I: "none",
  O: "none",
  T: "none",
  S: "none",
  Z: "none",
  J: "none",
  L: "none",
  N: "none",
};

export const TETRIS_SKINS: Record<SkinId, TetrisSkin> = {
  // Standard genre colors on black, solid gray well, no glow
  clasico: {
    colors: {
      background: "#000000",
      grid: "#ffffff",
      frame: "#808080",
      label: "#ffffff",
      highlight: "rgba(255,255,255,0.3)",
    },
    pieces: {
      I: "#00f0f0",
      O: "#f0f000",
      T: "#a020f0",
      S: "#00f000",
      Z: "#f00000",
      J: "#3a6bff",
      L: "#f0a000",
      N: "#a0a0a0",
    },
    marks: NO_MARKS,
    glow: 0,
    gridAlpha: 0.06,
    frameAlpha: 1,
    ghostAlpha: 0.2,
    highlightHeight: 4,
  },
  // Platform neon, identical to the pre-skins render
  neon: {
    colors: {
      background: "#000000",
      grid: { cssVar: "--cyan", fallback: "#00f5ff" },
      frame: { cssVar: "--cyan", fallback: "#00f5ff" },
      label: { cssVar: "--cyan", fallback: "#00f5ff" },
      highlight: "rgba(255,255,255,0.12)",
    },
    pieces: {
      I: { cssVar: "--cyan", fallback: "#00f5ff" },
      O: { cssVar: "--yellow", fallback: "#f5ff00" },
      T: { cssVar: "--magenta", fallback: "#ff006e" },
      S: { cssVar: "--green", fallback: "#00ff88" },
      Z: "#ff3b3b",
      J: "#3d7bff",
      L: "#ff8a00",
      N: "#9aa7b8",
    },
    marks: NO_MARKS,
    glow: 8,
    gridAlpha: 0.08,
    frameAlpha: 0.35,
    ghostAlpha: 0.2,
    highlightHeight: 4,
  },
  // Blue-white phosphor monitor: 4 tones × 2 marks tell the 8 pieces apart
  retro: {
    colors: {
      background: "#0a0f1f",
      grid: "#5577d0",
      frame: "#7a9ef0",
      label: "#a8c4ff",
      highlight: "rgba(232,240,255,0.2)",
    },
    pieces: {
      I: "#e8f0ff",
      O: "#a8c4ff",
      T: "#7a9ef0",
      S: "#5577d0",
      Z: "#e8f0ff",
      J: "#a8c4ff",
      L: "#7a9ef0",
      N: "#5577d0",
    },
    marks: {
      I: "none",
      O: "none",
      T: "none",
      S: "none",
      Z: "core",
      J: "core",
      L: "core",
      N: "core",
    },
    glow: 3,
    gridAlpha: 0.15,
    frameAlpha: 0.6,
    ghostAlpha: 0.3,
    highlightHeight: 0,
  },
};

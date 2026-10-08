// Constants and pure helpers ported 1:1 from references/started-games/04-arkanoid/game.js.
// Only the look changed: neon vector shapes instead of the sprite sheet.
import type { BlockColor } from "./levels";

export const W = 800;
export const H = 600;

export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const PADDLE_SPEED = 400; // px/s

export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200; // px/s, multiplied by the level speed
export const BASE_BALL_VY = -300;

export const BLOCK_COLS = 10;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
export const BLOCKS_ORIGIN_Y = 80;

export const EXPLOSION_DURATION = 150; // ms, 4 frames
const EXPLOSION_FRAMES = 4;
const BLOCK_GAP = 2;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Ball extends Rect {
  vx: number;
  vy: number;
}

export interface Block extends Rect {
  color: BlockColor;
  alive: boolean;
}

export interface Explosion extends Rect {
  color: BlockColor;
  elapsed: number; // ms
}

// Original block color → neon tone. With a :root var the hex is its fallback;
// red, hotpink and gray have no var and use the engine's own tones (red and gray as in Tetris).
export const BLOCK_COLORS: Record<
  BlockColor,
  { cssVar?: string; hex: string }
> = {
  cyan: { cssVar: "--cyan", hex: "#00f5ff" },
  yellow: { cssVar: "--yellow", hex: "#f5ff00" },
  magenta: { cssVar: "--magenta", hex: "#ff006e" },
  green: { cssVar: "--green", hex: "#00ff88" },
  red: { hex: "#ff3b3b" },
  hotpink: { hex: "#ff5ec8" },
  gray: { hex: "#9aa7b8" },
};

export interface Palette {
  blocks: Record<BlockColor, string>;
  paddle: string;
  ball: string;
}

export function collideAABB(a: Rect, b: Rect) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

// Glow comes from the caller's shadowBlur
function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  // highlight, without glow
  const blur = ctx.shadowBlur;
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(x, y, w, Math.min(4, h / 3));
  ctx.shadowBlur = blur;
}

export function drawBlock(
  ctx: CanvasRenderingContext2D,
  b: Rect,
  color: string,
) {
  const g = BLOCK_GAP / 2;
  drawRect(ctx, b.x + g, b.y + g, b.w - BLOCK_GAP, b.h - BLOCK_GAP, color);
}

// 4 discrete frames: the block grows and fades (alpha 1, 0.75, 0.5, 0.25)
export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  e: Explosion,
  color: string,
) {
  const frame = Math.min(
    Math.floor((e.elapsed / EXPLOSION_DURATION) * EXPLOSION_FRAMES),
    EXPLOSION_FRAMES - 1,
  );
  const scale = 1 + frame * 0.15;
  const w = e.w * scale;
  const h = e.h * scale;
  ctx.globalAlpha = 1 - frame * 0.25;
  drawBlock(
    ctx,
    { x: e.x - (w - e.w) / 2, y: e.y - (h - e.h) / 2, w, h },
    color,
  );
  ctx.globalAlpha = 1;
}

export function drawPaddle(
  ctx: CanvasRenderingContext2D,
  p: Rect,
  color: string,
) {
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(p.x, p.y, p.w, p.h, p.h / 2);
  ctx.fill();
}

export function drawBall(
  ctx: CanvasRenderingContext2D,
  b: Rect,
  color: string,
) {
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2);
  ctx.fill();
}

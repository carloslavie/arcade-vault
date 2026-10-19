// Constants and pure helpers ported 1:1 from references/started-games/04-arkanoid/game.js.
// Only the look changed: vector shapes instead of the sprite sheet, colored by the active skin.
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

// Resolved colors of the active skin
export interface Palette {
  background: string;
  paddle: string;
  paddleTrim: string; // paddle ends
  ball: string;
  highlight: string; // top strip of blocks and explosions
  shade: string; // bottom strip, only with bevel
  blocks: Record<BlockColor, string>;
}

// Block render settings of the active skin
export interface BlockStyle {
  highlightHeight: number; // px, capped at h / 3
  bevel: number; // px of bottom shade, 0 = none
}

const PADDLE_TRIM = 10; // px per end

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
  palette: Palette,
  style: BlockStyle,
) {
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  // highlight and bevel, without glow
  const blur = ctx.shadowBlur;
  ctx.shadowBlur = 0;
  const top = Math.min(style.highlightHeight, h / 3);
  if (top > 0) {
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(x, y, w, top);
  }
  if (style.bevel > 0) {
    ctx.fillStyle = palette.shade;
    ctx.fillRect(x, y + h - style.bevel, w, style.bevel);
  }
  ctx.shadowBlur = blur;
}

export function drawBlock(
  ctx: CanvasRenderingContext2D,
  b: Rect,
  color: string,
  palette: Palette,
  style: BlockStyle,
) {
  const g = BLOCK_GAP / 2;
  drawRect(
    ctx,
    b.x + g,
    b.y + g,
    b.w - BLOCK_GAP,
    b.h - BLOCK_GAP,
    color,
    palette,
    style,
  );
}

// 4 discrete frames: the block grows and fades (alpha 1, 0.75, 0.5, 0.25)
export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  e: Explosion,
  palette: Palette,
  style: BlockStyle,
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
    palette.blocks[e.color],
    palette,
    style,
  );
  ctx.globalAlpha = 1;
}

export function drawPaddle(
  ctx: CanvasRenderingContext2D,
  p: Rect,
  palette: Palette,
) {
  ctx.shadowColor = palette.paddle;
  ctx.fillStyle = palette.paddle;
  ctx.beginPath();
  ctx.roundRect(p.x, p.y, p.w, p.h, p.h / 2);
  ctx.fill();
  if (palette.paddleTrim === palette.paddle) return;
  // Trims clipped to the same capsule, without glow
  ctx.save();
  ctx.clip();
  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.paddleTrim;
  ctx.fillRect(p.x, p.y, PADDLE_TRIM, p.h);
  ctx.fillRect(p.x + p.w - PADDLE_TRIM, p.y, PADDLE_TRIM, p.h);
  ctx.restore();
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

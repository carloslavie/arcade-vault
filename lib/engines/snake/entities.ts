// Constants and pure helpers for the Snake engine (SPEC 12, designed from scratch).
// Neon vector snake on a 32×24 board; the fruit is a pixel-art sprite from sprites.ts.
import type { SpriteRect } from "./sprites";

export const W = 800;
export const H = 600;

export const CELL = 25;
export const COLS = W / CELL; // 32
export const ROWS = H / CELL; // 24

export const START_SPEED = 8; // steps/s at level 1
export const MAX_SPEED = 20; // reached at level 13
export const FRUITS_PER_LEVEL = 5;
export const FRUIT_POINTS = 10;
export const MAX_QUEUED_TURNS = 2;

const SEGMENT_INSET = 2;
const GRID_ALPHA = 0.08;

export interface Cell {
  x: number;
  y: number;
}

export type Dir = "up" | "down" | "left" | "right";

const DELTAS: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export interface Palette {
  body: string;
  head: string;
  grid: string;
  fallbackFruit: string;
}

// Head first; 3 segments in the middle of the board, facing right
export function initialSnake(): Cell[] {
  return [
    { x: 16, y: 12 },
    { x: 15, y: 12 },
    { x: 14, y: 12 },
  ];
}

export function stepCell(c: Cell, dir: Dir): Cell {
  const d = DELTAS[dir];
  return { x: c.x + d.x, y: c.y + d.y };
}

export function isOpposite(a: Dir, b: Dir) {
  return OPPOSITE[a] === b;
}

export function insideBoard(c: Cell) {
  return c.x >= 0 && c.x < COLS && c.y >= 0 && c.y < ROWS;
}

export function sameCell(a: Cell, b: Cell) {
  return a.x === b.x && a.y === b.y;
}

export function speedForLevel(level: number) {
  return Math.min(START_SPEED + (level - 1), MAX_SPEED);
}

export function levelForFruits(fruits: number) {
  return Math.floor(fruits / FRUITS_PER_LEVEL) + 1;
}

// Random cell not covered by the snake; null when the board is full
export function randomFreeCell(snake: readonly Cell[]): Cell | null {
  const taken = new Set(snake.map((c) => c.y * COLS + c.x));
  const free: number[] = [];
  for (let i = 0; i < COLS * ROWS; i++) if (!taken.has(i)) free.push(i);
  if (free.length === 0) return null;
  const i = free[Math.floor(Math.random() * free.length)];
  return { x: i % COLS, y: Math.floor(i / COLS) };
}

export function drawGrid(ctx: CanvasRenderingContext2D, color: string) {
  ctx.save();
  ctx.globalAlpha = GRID_ALPHA;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < COLS; x++) {
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, H);
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(W, y * CELL + 0.5);
  }
  ctx.stroke();
  ctx.restore();
}

function segmentRect(ctx: CanvasRenderingContext2D, c: Cell) {
  ctx.rect(
    c.x * CELL + SEGMENT_INSET,
    c.y * CELL + SEGMENT_INSET,
    CELL - SEGMENT_INSET * 2,
    CELL - SEGMENT_INSET * 2,
  );
}

// Body in one path so the glow is applied once; the head goes on top in its own color
export function drawSnake(
  ctx: CanvasRenderingContext2D,
  snake: readonly Cell[],
  palette: Palette,
  glow: number,
) {
  ctx.save();
  ctx.shadowBlur = glow;
  ctx.shadowColor = palette.body;
  ctx.fillStyle = palette.body;
  ctx.beginPath();
  for (let i = 1; i < snake.length; i++) segmentRect(ctx, snake[i]);
  ctx.fill();
  ctx.shadowColor = palette.head;
  ctx.fillStyle = palette.head;
  ctx.beginPath();
  segmentRect(ctx, snake[0]);
  ctx.fill();
  ctx.restore();
}

// Sprite centered in its cell, scaled to fit 25×25 keeping its proportions.
// Without an image (not loaded or failed) it falls back to a neon core.
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  image: HTMLImageElement | null,
  sprite: SpriteRect,
  palette: Palette,
  glow: number,
) {
  const cx = cell.x * CELL + CELL / 2;
  const cy = cell.y * CELL + CELL / 2;
  ctx.save();
  if (image) {
    const scale = Math.min(CELL / sprite.w, CELL / sprite.h);
    const w = sprite.w * scale;
    const h = sprite.h * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image,
      sprite.x,
      sprite.y,
      sprite.w,
      sprite.h,
      cx - w / 2,
      cy - h / 2,
      w,
      h,
    );
  } else {
    ctx.shadowBlur = glow;
    ctx.shadowColor = palette.fallbackFruit;
    ctx.fillStyle = palette.fallbackFruit;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

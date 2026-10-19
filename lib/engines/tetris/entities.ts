// Board, pieces and pure helpers ported 1:1 from references/started-games/03-tetris/game.js.
// Only the colors changed: they come from the active skin.

export const W = 800;
export const H = 600;

export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;

// The 300×600 board is centered in the 800×600 logical space
export const BOARD_X = (W - COLS * BLOCK) / 2;
export const BOARD_Y = 0;

export const LINE_SCORES = [0, 100, 300, 500, 800];

export type Board = number[][];
export type Shape = number[][];

export interface Piece {
  type: number;
  shape: Shape;
  x: number;
  y: number;
}

export type PieceName = "I" | "O" | "T" | "S" | "Z" | "J" | "L" | "N";

// Board cell value (1–8, in PIECES order) → piece name; index 0 is the empty cell
export const PIECE_NAMES: readonly (PieceName | null)[] = [
  null,
  "I",
  "O",
  "T",
  "S",
  "Z",
  "J",
  "L",
  "N",
];

// "core" paints a background-colored hole in the middle of the block
export type BlockMark = "none" | "core";

// Resolved colors of the active skin
export interface Palette {
  background: string;
  grid: string;
  frame: string; // board border and next box
  label: string; // SIGUIENTE
  highlight: string; // top strip of each block
  pieces: Record<PieceName, string>;
}

// Block render settings of the active skin
export interface BlockStyle {
  highlight: string;
  highlightHeight: number; // px, 0 = none
  mark: BlockMark;
  background: string; // core hole color
}

const CORE_SIZE = 10;

export const PIECES: (Shape | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type]!.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

export function collide(board: Board, shape: Shape, ox: number, oy: number) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

export function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

// Cell (x, y) in `size` units from the origin (ox, oy); glow comes from the caller's shadowBlur
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  x: number,
  y: number,
  color: string,
  size: number,
  style: BlockStyle,
  alpha = 1,
) {
  const px = ox + x * size;
  const py = oy + y * size;
  ctx.globalAlpha = alpha;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
  // highlight and core hole, without glow
  const blur = ctx.shadowBlur;
  ctx.shadowBlur = 0;
  if (style.highlightHeight > 0) {
    ctx.fillStyle = style.highlight;
    ctx.fillRect(px + 1, py + 1, size - 2, style.highlightHeight);
  }
  if (style.mark === "core") {
    ctx.fillStyle = style.background;
    ctx.fillRect(
      px + (size - CORE_SIZE) / 2,
      py + (size - CORE_SIZE) / 2,
      CORE_SIZE,
      CORE_SIZE,
    );
  }
  ctx.shadowBlur = blur;
  ctx.globalAlpha = 1;
}

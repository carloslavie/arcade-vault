// Constants and pure helpers for the Ranaria engine (SPEC 19, designed from scratch).
// Vector frog crossing an endless world of roads and rivers, colored by the active skin.
import {
  CELL,
  FIELD_COLS,
  type Lane,
  MAX_SPEED_MUL,
  type Row,
  SHORE_EVERY,
  SPEED_STEP,
  speedMul,
} from "./generator";

export { CELL, MAX_SPEED_MUL, SHORE_EVERY, SPEED_STEP, speedMul };

export const W = 800;
export const H = 600;

export const COLS = FIELD_COLS; // 19
export const FIELD_X = 20; // 20 px of hedge on each side
export const FIELD_W = COLS * CELL; // 760
export const VISIBLE_ROWS = 15;

export const START_ROW = 2;
export const START_COL = 9;
export const HOME_COLS = [1, 5, 9, 13, 17];
export const HOME_TOLERANCE = 20;

export const HOP_MS = 120;
export const HOP_SCALE = 1.15; // frog scale at mid hop
export const CAM_SPEED = 6; // rows/s
export const CAM_LEAD = 4; // rows kept below the highest row
export const TIDE_START = -1;
export const TIDE_BASE = 0.35; // rows/s at level 1
export const TIDE_CUSHION = 3.75; // max rows between the tide and the highest row
export const DEATH_MS = 700;
export const LILY_FLASH_MS = 400;
export const DIVE_CYCLE = [2.5, 0.5, 1]; // afloat, sinking (still holds), under (s)

export const ROW_POINTS = 10;
export const HOME_POINTS = 100;

const FROG_BOX = 28;
const VEHICLE_INSET = 4;
const TURTLE_RADIUS = 14;
const LILY_RADIUS = 15;
const WAVE_AMPLITUDE = 4;
const WAVE_LENGTH = 80;

export type Dir = "up" | "down" | "left" | "right";

export interface Frog {
  row: number; // landed row
  x: number; // center, continuous
  facing: Dir;
  hop: { fromRow: number; fromX: number; elapsed: number } | null;
}

// Resolved colors of the active skin
export interface Palette {
  background: string;
  grass: string;
  laneLine: string;
  river: string;
  hedge: string;
  lily: string;
  frog: string;
  eye: string;
  log: string;
  turtle: string;
  car1: string;
  car2: string;
  car3: string;
  truck: string;
  tide: string;
  crestAlt: string;
  hit: string;
  splash: string;
}

// Render settings of the active skin besides the colors
export interface Render {
  glow: number;
  grassAlpha: number;
  hedgeAlpha: number;
  laneLineAlpha: number;
  logFillAlpha: number;
  tideAlpha: number;
}

export type TurtleState = "afloat" | "sinking" | "under";

// Center x of a grid column
export function colX(col: number) {
  return FIELD_X + col * CELL + CELL / 2;
}

// Nearest column center, used when landing on grass or road
export function snapX(x: number) {
  const col = Math.round((x - FIELD_X - CELL / 2) / CELL);
  return colX(Math.max(0, Math.min(COLS - 1, col)));
}

// Top y on screen of world row r
export function rowToY(r: number, camBottom: number) {
  return H - (r - camBottom + 1) * CELL;
}

// Screen y of a world height in rows (bottom of row r is height r)
export function heightToY(h: number, camBottom: number) {
  return H - (h - camBottom) * CELL;
}

// Left edge and width of every object of a lane at world time t (s)
export function laneObjects(lane: Lane, t: number) {
  const pitch = (lane.len + lane.gap) * CELL;
  const period = lane.count * pitch;
  const w = lane.len * CELL;
  const shift = lane.offset + lane.dir * lane.speed * t;
  const out: { x: number; w: number; index: number }[] = [];
  for (let i = 0; i < lane.count; i++) {
    const pos = (((shift + i * pitch) % period) + period) % period;
    out.push({ x: FIELD_X + pos - w, w, index: i });
  }
  return out;
}

export function turtleState(lane: Lane, index: number, diveClock: number) {
  if (!lane.divers.includes(index)) return "afloat";
  const [afloat, sinking, under] = DIVE_CYCLE;
  const p = diveClock % (afloat + sinking + under);
  if (p < afloat) return "afloat";
  return p < afloat + sinking ? "sinking" : "under";
}

// True if the frog center rests on a log or on turtles that still hold
export function isSupported(
  lane: Lane,
  x: number,
  t: number,
  diveClock: number,
) {
  return laneObjects(lane, t).some(
    (o) =>
      x >= o.x &&
      x <= o.x + o.w &&
      (lane.kind !== "turtle" ||
        turtleState(lane, o.index, diveClock) !== "under"),
  );
}

// Horizontal overlap of the frog box with a vehicle box (trimmed 4 px per side)
export function hitsVehicle(lane: Lane, x: number, t: number) {
  const left = x - FROG_BOX / 2;
  const right = x + FROG_BOX / 2;
  return laneObjects(lane, t).some(
    (o) => right > o.x + VEHICLE_INSET && left < o.x + o.w - VEHICLE_INSET,
  );
}

// Vertical half size of the frog box, in rows
export const FROG_HALF_ROWS = FROG_BOX / 2 / CELL;

// Index in HOME_COLS of the lily pad under x, or -1 for the hedge
export function homeAt(x: number) {
  return HOME_COLS.findIndex((col) => Math.abs(colX(col) - x) < HOME_TOLERANCE);
}

// ── Drawing ─────────────────────────────────────────────────────────────────

function carColor(lane: Lane, palette: Palette) {
  return [palette.car1, palette.car2, palette.car3][lane.tint];
}

function glowOn(ctx: CanvasRenderingContext2D, color: string, glow: number) {
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
}

function drawVehicle(
  ctx: CanvasRenderingContext2D,
  lane: Lane,
  x: number,
  w: number,
  y: number,
  palette: Palette,
  render: Render,
) {
  const color = lane.kind === "truck" ? palette.truck : carColor(lane, palette);
  const left = x + VEHICLE_INSET;
  const width = w - VEHICLE_INSET * 2;
  const top = y + 7;
  const height = CELL - 14;
  glowOn(ctx, color, render.glow);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(left, top, width, height);
  ctx.globalAlpha = 1;
  ctx.strokeRect(left, top, width, height);
  ctx.beginPath();
  if (lane.kind === "truck") {
    // Cab on the front side
    const cab = lane.dir === 1 ? left + width - 18 : left + 18;
    ctx.moveTo(cab, top);
    ctx.lineTo(cab, top + height);
  } else {
    // Windshield on the front side
    const glass = lane.dir === 1 ? left + width - 9 : left + 9;
    ctx.moveTo(glass, top + 4);
    ctx.lineTo(glass, top + height - 4);
  }
  ctx.stroke();
}

function drawLog(
  ctx: CanvasRenderingContext2D,
  x: number,
  w: number,
  y: number,
  palette: Palette,
  render: Render,
) {
  const left = x + 2;
  const width = w - 4;
  const top = y + 8;
  const height = CELL - 16;
  glowOn(ctx, palette.log, render.glow);
  ctx.strokeStyle = palette.log;
  ctx.fillStyle = palette.log;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(left, top, width, height, height / 2);
  ctx.globalAlpha = render.logFillAlpha;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
}

function drawTurtles(
  ctx: CanvasRenderingContext2D,
  len: number,
  x: number,
  y: number,
  state: TurtleState,
  palette: Palette,
  render: Render,
) {
  glowOn(ctx, palette.turtle, state === "under" ? 0 : render.glow);
  ctx.strokeStyle = palette.turtle;
  ctx.fillStyle = palette.turtle;
  ctx.lineWidth = 2;
  ctx.globalAlpha = state === "afloat" ? 1 : state === "sinking" ? 0.5 : 0.15;
  for (let i = 0; i < len; i++) {
    ctx.beginPath();
    ctx.arc(
      x + i * CELL + CELL / 2,
      y + CELL / 2,
      TURTLE_RADIUS,
      0,
      Math.PI * 2,
    );
    if (state !== "under") ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// One world row at screen y; flashHome is the lily pad to fill, if any
export function drawRow(
  ctx: CanvasRenderingContext2D,
  row: Row,
  y: number,
  t: number,
  diveClock: number,
  palette: Palette,
  render: Render,
  flashHome: number,
) {
  ctx.shadowBlur = 0;
  if (row.kind === "grass") {
    ctx.globalAlpha = render.grassAlpha;
    ctx.fillStyle = palette.grass;
    ctx.fillRect(FIELD_X, y, FIELD_W, CELL);
    ctx.globalAlpha = 1;
    return;
  }
  if (row.kind === "shore") {
    ctx.globalAlpha = render.hedgeAlpha;
    ctx.fillStyle = palette.hedge;
    ctx.fillRect(FIELD_X, y, FIELD_W, CELL);
    ctx.globalAlpha = 1;
    glowOn(ctx, palette.lily, render.glow);
    ctx.strokeStyle = palette.lily;
    ctx.fillStyle = palette.lily;
    ctx.lineWidth = 2;
    HOME_COLS.forEach((col, i) => {
      ctx.beginPath();
      ctx.arc(colX(col), y + CELL / 2, LILY_RADIUS, 0, Math.PI * 2);
      if (i === flashHome) ctx.fill();
      ctx.stroke();
    });
    return;
  }
  const lane = row.lane!;
  if (row.kind === "river") {
    ctx.fillStyle = palette.river;
    ctx.fillRect(FIELD_X, y, FIELD_W, CELL);
  } else if (render.laneLineAlpha > 0) {
    ctx.globalAlpha = render.laneLineAlpha;
    ctx.strokeStyle = palette.laneLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(FIELD_X, y + 0.5);
    ctx.lineTo(FIELD_X + FIELD_W, y + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  for (const o of laneObjects(lane, t)) {
    if (o.x + o.w < FIELD_X || o.x > FIELD_X + FIELD_W) continue;
    if (lane.kind === "log") drawLog(ctx, o.x, o.w, y, palette, render);
    else if (lane.kind === "turtle")
      drawTurtles(
        ctx,
        lane.len,
        o.x,
        y,
        turtleState(lane, o.index, diveClock),
        palette,
        render,
      );
    else drawVehicle(ctx, lane, o.x, o.w, y, palette, render);
  }
}

// Hedge strips on both sides of the field
export function drawSideHedges(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  render: Render,
) {
  ctx.shadowBlur = 0;
  ctx.globalAlpha = render.hedgeAlpha;
  ctx.fillStyle = palette.hedge;
  ctx.fillRect(0, 0, FIELD_X, H);
  ctx.fillRect(FIELD_X + FIELD_W, 0, W - FIELD_X - FIELD_W, H);
  ctx.globalAlpha = 1;
}

const ROTATION: Record<Dir, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};

// Frog centered at (x, y), drawn facing up and rotated to its direction
export function drawFrog(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: Dir,
  scale: number,
  palette: Palette,
  render: Render,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ROTATION[facing]);
  ctx.scale(scale, scale);
  glowOn(ctx, palette.frog, render.glow);
  ctx.strokeStyle = palette.frog;
  ctx.fillStyle = palette.frog;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  // Legs: front pair forward, back pair folded
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(side * 6, -6);
    ctx.lineTo(side * 12, -12);
    ctx.lineTo(side * 12, -15);
    ctx.moveTo(side * 6, 7);
    ctx.lineTo(side * 13, 10);
    ctx.lineTo(side * 11, 15);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 1, 9, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.eye;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * 4.5, -6, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Tide band from its crest (screen y) to the bottom edge
export function drawTide(
  ctx: CanvasRenderingContext2D,
  crestY: number,
  wavePhase: number,
  palette: Palette,
  render: Render,
) {
  if (crestY - WAVE_AMPLITUDE > H) return;
  const wave = (x: number, shift: number) =>
    crestY +
    WAVE_AMPLITUDE *
      Math.sin(((x + wavePhase + shift) / WAVE_LENGTH) * Math.PI * 2);
  const path = (shift: number) => {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      if (x === 0) ctx.moveTo(x, wave(x, shift));
      else ctx.lineTo(x, wave(x, shift));
    }
  };

  ctx.shadowBlur = 0;
  path(0);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.globalAlpha = render.tideAlpha;
  ctx.fillStyle = palette.tide;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.lineWidth = 3;
  glowOn(ctx, palette.tide, render.glow);
  ctx.strokeStyle = palette.tide;
  path(0);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  glowOn(ctx, palette.crestAlt, render.glow);
  ctx.strokeStyle = palette.crestAlt;
  path(WAVE_LENGTH / 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Expanding ring; progress goes from 0 to 1
export function drawDeath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  color: string,
  render: Render,
) {
  glowOn(ctx, color, render.glow);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 1 - progress;
  ctx.beginPath();
  ctx.arc(x, y, 10 + 40 * progress, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Rows that the frog box overlaps at a world height (frog center, in rows)
export function rowsUnderFrog(centerRow: number) {
  const low = Math.floor(centerRow - FROG_HALF_ROWS);
  const high = Math.floor(centerRow + FROG_HALF_ROWS);
  return low === high ? [low] : [low, high];
}

export function isShoreRow(r: number) {
  return r > 0 && r % SHORE_EVERY === 0;
}

// Ranaria engine (SPEC 19): state, input and rAF loop per instance, without globals.
// The platform draws the HUD, the pause and the game over; the canvas keeps only the world
// and the rising tide, colored by the active skin.

import { resolveColors } from "@/lib/engines/skin-colors";
import type { SkinId } from "@/lib/engines/skins";
import type { GameFactory, GamePhase, GameStats } from "@/lib/engines/types";
import { SCORE_LIMITS } from "@/lib/scores";
import {
  CAM_LEAD,
  CAM_SPEED,
  CELL,
  colX,
  DEATH_MS,
  type Dir,
  drawDeath,
  drawFrog,
  drawRow,
  drawSideHedges,
  drawTide,
  FIELD_W,
  FIELD_X,
  type Frog,
  H,
  heightToY,
  hitsVehicle,
  homeAt,
  HOME_POINTS,
  HOP_MS,
  HOP_SCALE,
  isSupported,
  LILY_FLASH_MS,
  type Palette,
  type Render,
  ROW_POINTS,
  rowsUnderFrog,
  rowToY,
  snapX,
  speedMul,
  START_COL,
  START_ROW,
  TIDE_BASE,
  TIDE_CUSHION,
  TIDE_START,
  VISIBLE_ROWS,
  W,
} from "./entities";
import { createRowGenerator, type Row } from "./generator";
import { RANARIA_SKINS } from "./skins";

// Keys that would scroll the page while the game listens
const CAPTURED = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);
const ARROW_DIRS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};
const ROWS_ABOVE = VISIBLE_ROWS + 2; // generated above the camera
const ROWS_BELOW = 2; // kept below the camera
const MIN_X = FIELD_X + CELL / 2; // 40
const MAX_X = FIELD_X + FIELD_W - CELL / 2; // 760
const WAVE_SPEED = 40; // px/s the crest drifts

export const createRanariaGame: GameFactory = (canvas, callbacks, options) => {
  const ctx = canvas.getContext("2d")!;
  // Logic stays in 800×600; the backing store is scaled for sharp lines
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Active skin: resolved colors plus render settings
  let palette: Palette;
  let render: Render;

  function applySkin(id: SkinId) {
    const { colors, ...settings } = RANARIA_SKINS[id];
    palette = resolveColors(colors);
    render = settings;
  }
  applySkin(options.skin);

  // ── Game state ──────────────────────────────────────────────────────────────
  let phase: GamePhase = "ready";
  let generator = createRowGenerator(Math.random);
  let rows: Row[] = []; // ascending by index
  let frog: Frog;
  let pendingHop: Dir | null = null;
  let maxRow = START_ROW;
  let camBottom = 0; // rows, bottom edge of the screen
  let tide = TIDE_START; // rows, crest height
  let score = 0;
  let level = 1;
  let worldTime = 0; // s of play; drives lanes, dives and the crest
  let death: { elapsed: number; x: number; h: number; color: string } | null =
    null;
  let lilyFlash: { row: number; home: number; until: number } | null = null;
  let lastStats: GameStats | null = null;
  let lastTime: number | null = null; // reset on every phase change so dt never jumps
  let raf = 0;

  function emitStats() {
    if (lastStats && lastStats.score === score && lastStats.level === level)
      return;
    lastStats = { score, level };
    callbacks.onStats(lastStats);
  }

  function setPhase(nextPhase: GamePhase) {
    if (phase === nextPhase) return;
    phase = nextPhase;
    lastTime = null;
    pendingHop = null;
    // The platform saves the score it last heard, so the final points go out first
    if (nextPhase === "over") emitStats();
    callbacks.onPhase(nextPhase);
  }

  // Generates rows up to the top margin and drops the ones far below the camera
  function fillRows() {
    const base = Math.floor(camBottom);
    let next = rows.length ? rows[rows.length - 1].index + 1 : 0;
    while (next <= base + ROWS_ABOVE) {
      rows.push(generator.next(level));
      next++;
    }
    while (rows.length && rows[0].index < base - ROWS_BELOW) rows.shift();
  }

  function rowAt(r: number): Row | undefined {
    return rows.length ? rows[r - rows[0].index] : undefined;
  }

  function initGame() {
    generator = createRowGenerator(Math.random);
    rows = [];
    frog = { row: START_ROW, x: colX(START_COL), facing: "up", hop: null };
    pendingHop = null;
    maxRow = START_ROW;
    camBottom = 0;
    tide = TIDE_START;
    score = 0;
    level = 1;
    worldTime = 0;
    death = null;
    lilyFlash = null;
    fillRows();
    emitStats();
  }

  // ── Frog ────────────────────────────────────────────────────────────────────
  // Interpolated position: x and center height in rows
  function frogPos() {
    if (!frog.hop) return { x: frog.x, h: frog.row + 0.5, p: 1 };
    const p = Math.min(frog.hop.elapsed / HOP_MS, 1);
    return {
      x: frog.hop.fromX + (frog.x - frog.hop.fromX) * p,
      h: frog.hop.fromRow + (frog.row - frog.hop.fromRow) * p + 0.5,
      p,
    };
  }

  function startHop(dir: Dir) {
    let row = frog.row;
    let x = frog.x;
    if (dir === "up") row++;
    else if (dir === "down") row--;
    else x += dir === "left" ? -CELL : CELL;
    if (row < 0 || x < MIN_X || x > MAX_X) return;
    frog.facing = dir;
    frog.hop = { fromRow: frog.row, fromX: frog.x, elapsed: 0 };
    frog.row = row;
    frog.x = x;
  }

  function die(colorKey: "hit" | "splash") {
    const { x, h } = frogPos();
    frog.hop = null;
    pendingHop = null;
    death = { elapsed: 0, x, h, color: palette[colorKey] };
  }

  function land() {
    frog.hop = null;
    const isNew = frog.row > maxRow;
    if (isNew) {
      maxRow = frog.row;
      score = Math.min(score + ROW_POINTS, SCORE_LIMITS.max);
    }
    const row = rowAt(frog.row);
    if (!row) return;
    if (row.kind === "grass" || row.kind === "road") frog.x = snapX(frog.x);
    if (
      row.kind === "river" &&
      !isSupported(row.lane!, frog.x, worldTime, worldTime)
    )
      return die("splash");
    if (row.kind === "shore") {
      const home = homeAt(frog.x);
      if (home < 0) return die("hit");
      // Bonus only the first time the shore is reached
      if (isNew) {
        score = Math.min(score + HOME_POINTS, SCORE_LIMITS.max);
        level++;
        tide = maxRow - TIDE_CUSHION;
        lilyFlash = {
          row: frog.row,
          home,
          until: worldTime + LILY_FLASH_MS / 1000,
        };
      }
    }
    if (pendingHop) {
      const next = pendingHop;
      pendingHop = null;
      startHop(next);
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dtMs: number) {
    const dt = dtMs / 1000;
    worldTime += dt;

    if (death) {
      death.elapsed += dtMs;
      if (death.elapsed >= DEATH_MS) setPhase("over");
      return;
    }

    if (frog.hop) {
      frog.hop.elapsed += dtMs;
      if (frog.hop.elapsed >= HOP_MS) land();
      if (death) return;
    } else {
      // Riding a log or turtles
      const row = rowAt(frog.row);
      if (row?.kind === "river") {
        const lane = row.lane!;
        frog.x += lane.dir * lane.speed * dt;
        if (frog.x < FIELD_X || frog.x > FIELD_X + FIELD_W)
          return die("splash");
        if (!isSupported(lane, frog.x, worldTime, worldTime))
          return die("splash");
      }
    }

    // Vehicles, checked every frame with the interpolated position
    const pos = frogPos();
    for (const r of rowsUnderFrog(pos.h)) {
      const row = rowAt(r);
      if (row?.kind === "road" && hitsVehicle(row.lane!, pos.x, worldTime))
        return die("hit");
    }

    // The tide rises and never lags more than the cushion behind
    tide = Math.max(
      tide + TIDE_BASE * speedMul(level) * dt,
      maxRow - TIDE_CUSHION,
    );
    if (tide >= pos.h) return die("splash");

    // Camera only goes up
    const target = Math.max(0, maxRow - CAM_LEAD);
    if (target > camBottom)
      camBottom = Math.min(target, camBottom + CAM_SPEED * dt);
    fillRows();
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  function draw() {
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.beginPath();
    ctx.rect(FIELD_X, 0, FIELD_W, H);
    ctx.clip();
    for (const row of rows) {
      const y = rowToY(row.index, camBottom);
      if (y > H || y + CELL < 0) continue;
      const flash =
        lilyFlash && lilyFlash.row === row.index && worldTime < lilyFlash.until
          ? lilyFlash.home
          : -1;
      drawRow(ctx, row, y, worldTime, worldTime, palette, render, flash);
    }
    ctx.restore();
    drawSideHedges(ctx, palette, render);

    if (death) {
      drawDeath(
        ctx,
        death.x,
        heightToY(death.h, camBottom),
        Math.min(death.elapsed / DEATH_MS, 1),
        death.color,
        render,
      );
    } else {
      const { x, h, p } = frogPos();
      const scale = frog.hop ? 1 + (HOP_SCALE - 1) * Math.sin(Math.PI * p) : 1;
      drawFrog(
        ctx,
        x,
        heightToY(h, camBottom),
        frog.facing,
        scale,
        palette,
        render,
      );
    }

    drawTide(
      ctx,
      heightToY(tide, camBottom),
      worldTime * WAVE_SPEED,
      palette,
      render,
    );
    ctx.shadowBlur = 0;
  }

  // ── Main loop ───────────────────────────────────────────────────────────────
  function loop(ts: number) {
    if (phase === "playing") {
      const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50);
      lastTime = ts;
      update(dt);
      emitStats();
      draw();
    }
    raf = requestAnimationFrame(loop);
  }

  // ── Phase controls ──────────────────────────────────────────────────────────
  function start() {
    if (phase === "ready") setPhase("playing");
  }

  function pause() {
    if (phase === "playing") setPhase("paused");
  }

  function resume() {
    if (phase === "paused") setPhase("playing");
  }

  function end() {
    if (phase !== "over") setPhase("over");
  }

  function restart() {
    initGame();
    if (phase === "playing") lastTime = null;
    else setPhase("playing");
    draw();
  }

  // ── Listeners ───────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    if (phase === "over") return;
    if (CAPTURED.has(e.code)) e.preventDefault();
    if (e.repeat) return; // one hop per key press

    if (e.code === "KeyP" || e.code === "Escape") {
      if (phase === "playing") pause();
      else if (phase === "paused") resume();
      return;
    }
    if (phase === "ready") {
      if (e.code === "Space") start();
      return;
    }
    if (phase !== "playing" || death) return;
    const dir = ARROW_DIRS[e.code];
    if (!dir) return;
    if (!frog.hop) startHop(dir);
    else if (!pendingHop) pendingHop = dir;
  }

  function onBlur() {
    pause();
  }

  function onVisibilityChange() {
    if (document.hidden) pause();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibilityChange);

  initGame();
  draw();
  raf = requestAnimationFrame(loop);

  return {
    pause,
    resume,
    end,
    restart,
    setSkin(id) {
      applySkin(id);
      // The loop does not draw in these phases
      if (phase === "ready" || phase === "paused") draw();
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
};

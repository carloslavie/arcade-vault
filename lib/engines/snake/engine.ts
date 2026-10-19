// Snake engine (SPEC 12): state, input and step loop per instance, without globals.
// The platform draws the HUD, the pause and the game over; the canvas keeps only the board,
// colored by the active skin (SPEC 16).

import { resolveColors } from "@/lib/engines/skin-colors";
import type { SkinId } from "@/lib/engines/skins";
import type { GameFactory, GamePhase, GameStats } from "@/lib/engines/types";
import { SCORE_LIMITS } from "@/lib/scores";
import {
  type Cell,
  type Dir,
  drawFruit,
  drawGrid,
  drawSnake,
  FRUIT_POINTS,
  H,
  initialSnake,
  insideBoard,
  isOpposite,
  levelForFruits,
  MAX_QUEUED_TURNS,
  type Palette,
  randomFreeCell,
  sameCell,
  speedForLevel,
  stepCell,
  W,
} from "./entities";
import { type SnakeSkin, SNAKE_SKINS } from "./skins";
import { FRUIT_SPRITE_SRC, FRUITS } from "./sprites";

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
export const createSnakeGame: GameFactory = (canvas, callbacks, options) => {
  const ctx = canvas.getContext("2d")!;
  // Logic stays in 800×600; the backing store is scaled for sharp lines
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Active skin: resolved colors plus render settings
  let palette: Palette;
  let glow: number;
  let gridAlpha: number;
  let fruitStyle: SnakeSkin["fruitStyle"];
  // ── Fruit sprite ────────────────────────────────────────────────────────────
  // Space waits until it loads or fails; on failure the fruit is a fallback core
  let destroyed = false;
  let spriteSettled = false;
  let spriteImage: HTMLImageElement | null = null;
  let tintedAtlas: HTMLCanvasElement | null = null; // one-tone copy for tint skins

  // Same-size copy of the atlas filled with the fruit color (source-in keeps the alpha)
  function tintAtlas() {
    tintedAtlas = null;
    if (fruitStyle !== "tint" || !spriteImage) return;
    const atlas = document.createElement("canvas");
    atlas.width = spriteImage.naturalWidth;
    atlas.height = spriteImage.naturalHeight;
    const actx = atlas.getContext("2d")!;
    actx.imageSmoothingEnabled = false;
    actx.drawImage(spriteImage, 0, 0);
    actx.globalCompositeOperation = "source-in";
    actx.fillStyle = palette.fruit;
    actx.fillRect(0, 0, atlas.width, atlas.height);
    tintedAtlas = atlas;
  }

  function applySkin(id: SkinId) {
    const skin = SNAKE_SKINS[id];
    palette = resolveColors(skin.colors);
    glow = skin.glow;
    gridAlpha = skin.gridAlpha;
    fruitStyle = skin.fruitStyle;
    tintAtlas();
  }
  applySkin(options.skin);

  const img = new Image();
  img.onload = () => {
    if (destroyed) return;
    spriteImage = img;
    spriteSettled = true;
    tintAtlas();
    draw();
  };
  img.onerror = () => {
    if (destroyed) return;
    spriteSettled = true;
    draw();
  };
  img.src = FRUIT_SPRITE_SRC;

  // ── Game state ──────────────────────────────────────────────────────────────
  let phase: GamePhase = "ready";
  let snake: Cell[] = []; // head first
  let dir: Dir = "right";
  let turnQueue: Dir[] = [];
  let fruit: Cell | null = null;
  let fruitSprite = 0;
  let fruitsEaten = 0;
  let score = 0;
  let level = 1;
  let stepAccumulator = 0; // ms since the last step
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
    turnQueue = [];
    // The platform saves the score it last heard, so the final points go out first
    if (nextPhase === "over") emitStats();
    callbacks.onPhase(nextPhase);
  }

  // Returns false when the board is full
  function spawnFruit() {
    fruit = randomFreeCell(snake);
    fruitSprite = Math.floor(Math.random() * FRUITS.length);
    return fruit !== null;
  }

  function initGame() {
    snake = initialSnake();
    dir = "right";
    turnQueue = [];
    fruitsEaten = 0;
    score = 0;
    level = 1;
    stepAccumulator = 0;
    spawnFruit();
    emitStats();
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  // One cell per step; at most one queued turn per step
  function step() {
    const turn = turnQueue.shift();
    if (turn) dir = turn;

    const head = stepCell(snake[0], dir);
    if (!insideBoard(head)) return setPhase("over");

    // The tail leaves its cell in this step unless the snake grows
    const grows = fruit !== null && sameCell(head, fruit);
    const body = grows ? snake : snake.slice(0, -1);
    if (body.some((c) => sameCell(c, head))) return setPhase("over");

    snake.unshift(head);
    if (!grows) {
      snake.pop();
      return;
    }

    fruitsEaten++;
    score = Math.min(score + FRUIT_POINTS, SCORE_LIMITS.max);
    level = levelForFruits(fruitsEaten);
    if (!spawnFruit()) setPhase("over");
  }

  function update(dtMs: number) {
    stepAccumulator += dtMs;
    // Re-read the interval every step: eating can change the level
    while (phase === "playing") {
      const interval = 1000 / speedForLevel(level);
      if (stepAccumulator < interval) break;
      stepAccumulator -= interval;
      step();
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  function draw() {
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, W, H);

    drawGrid(ctx, palette.grid, gridAlpha);
    if (fruit && spriteSettled)
      drawFruit(
        ctx,
        fruit,
        fruitStyle === "tint" ? tintedAtlas : spriteImage,
        FRUITS[fruitSprite],
        palette,
        glow,
      );
    drawSnake(ctx, snake, palette, glow);
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
    if (phase === "ready" && spriteSettled) setPhase("playing");
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
  // A turn is dropped if it repeats or reverses the last queued direction
  // (or the current one with an empty queue), or if the queue is full
  function queueTurn(next: Dir) {
    const last = turnQueue.at(-1) ?? dir;
    if (next === last || isOpposite(next, last)) return;
    if (turnQueue.length >= MAX_QUEUED_TURNS) return;
    turnQueue.push(next);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (phase === "over") return;
    if (CAPTURED.has(e.code)) e.preventDefault();

    if (e.code === "KeyP" || e.code === "Escape") {
      if (e.repeat) return;
      if (phase === "playing") pause();
      else if (phase === "paused") resume();
      return;
    }
    if (phase === "ready") {
      if (e.code === "Space" && !e.repeat) start();
      return;
    }
    if (phase !== "playing") return;
    const next = ARROW_DIRS[e.code];
    if (next) queueTurn(next);
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
      destroyed = true;
      img.onload = img.onerror = null;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
};

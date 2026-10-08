// Arkanoid engine: game loop, state and input from game.js, per instance and without globals.
// The platform draws the HUD, the pause and the game over; the canvas keeps only the playfield.

import { SCORE_LIMITS } from "@/lib/scores";
import type { GameFactory, GamePhase, GameStats } from "@/lib/engines/types";
import {
  BALL_SIZE,
  type Ball,
  BASE_BALL_VX,
  BASE_BALL_VY,
  type Block,
  BLOCK_COLORS,
  BLOCK_H,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  collideAABB,
  drawBall,
  drawBlock,
  drawExplosion,
  drawPaddle,
  EXPLOSION_DURATION,
  type Explosion,
  H,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  type Palette,
  type Rect,
  W,
} from "./entities";
import { type BlockColor, LEVELS } from "./levels";

// Keys that would scroll the page while the game listens
const CAPTURED = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);
const GLOW = 10;
const BLOCK_POINTS = 10;

// Neon palette from :root, falling back to the current hex values
function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) =>
    css.getPropertyValue(name).trim() || fallback;
  const blocks = {} as Record<BlockColor, string>;
  for (const [color, { cssVar, hex }] of Object.entries(BLOCK_COLORS))
    blocks[color as BlockColor] = cssVar ? pick(cssVar, hex) : hex;
  return {
    blocks,
    paddle: pick("--cyan", "#00f5ff"),
    ball: pick("--ink", "#e6e9ff"),
  };
}

export const createArkanoidGame: GameFactory = (canvas, callbacks) => {
  const ctx = canvas.getContext("2d")!;
  // Logic stays in 800×600; the backing store is scaled for sharp lines
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const palette = readPalette();

  // ── Game state ──────────────────────────────────────────────────────────────
  let phase: GamePhase = "ready";
  const paddle: Rect = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  const ball: Ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  const keys = { ArrowLeft: false, ArrowRight: false };
  let lastStats: GameStats | null = null;
  let lastTime: number | null = null; // reset on every phase change so dt never jumps
  let raf = 0;

  function emitStats() {
    if (
      lastStats &&
      lastStats.score === score &&
      lastStats.lives === lives &&
      lastStats.level === level
    )
      return;
    lastStats = { score, lives, level };
    callbacks.onStats(lastStats);
  }

  function setPhase(nextPhase: GamePhase) {
    if (phase === nextPhase) return;
    phase = nextPhase;
    lastTime = null;
    keys.ArrowLeft = keys.ArrowRight = false;
    // The platform saves the score it last heard, so the final points go out first
    if (nextPhase === "over") emitStats();
    callbacks.onPhase(nextPhase);
  }

  // Ball on top of the paddle, launched up with the level speed
  function resetBall() {
    const speed = LEVELS[level - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  function loadLevel(n: number) {
    level = n;
    blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    resetBall();
  }

  function initGame() {
    score = 0;
    lives = 3;
    paddle.x = (W - paddle.w) / 2;
    loadLevel(1);
    emitStats();
  }

  // ── Update (dt in seconds) ──────────────────────────────────────────────────
  function update(dt: number) {
    // Paddle
    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    // Ball movement
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Wall bounces (left, right, top)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }

    // Paddle bounce: only vy changes, like the original
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
    }

    // Block collisions, one block per frame
    for (const block of blocks) {
      if (!block.alive || !collideAABB(ball, block)) continue;
      block.alive = false;
      explosions.push({
        x: block.x,
        y: block.y,
        w: block.w,
        h: block.h,
        color: block.color,
        elapsed: 0,
      });
      score = Math.min(score + BLOCK_POINTS, SCORE_LIMITS.max);
      ball.vy = -ball.vy;
      if (blocks.every((b) => !b.alive)) {
        if (level < LEVELS.length) loadLevel(level + 1);
        else return setPhase("over");
      }
      break;
    }

    // Explosions
    for (const e of explosions) e.elapsed += dt * 1000;
    explosions = explosions.filter((e) => e.elapsed < EXPLOSION_DURATION);

    // Ball lost
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        setPhase("over");
      } else resetBall();
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  function draw() {
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // Glow set once per group
    ctx.shadowBlur = GLOW;
    for (const b of blocks)
      if (b.alive) drawBlock(ctx, b, palette.blocks[b.color]);
    for (const e of explosions) drawExplosion(ctx, e, palette.blocks[e.color]);
    drawPaddle(ctx, paddle, palette.paddle);
    drawBall(ctx, ball, palette.ball);
    ctx.shadowBlur = 0;
  }

  // ── Main loop ───────────────────────────────────────────────────────────────
  function loop(ts: number) {
    if (phase === "playing") {
      const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50);
      lastTime = ts;
      update(dt / 1000);
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
    keys.ArrowLeft = keys.ArrowRight = false;
    if (phase === "playing") lastTime = null;
    else setPhase("playing");
    draw();
  }

  // ── Listeners ───────────────────────────────────────────────────────────────
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
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") keys[e.code] = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") keys[e.code] = false;
  }

  // CSS pixels of the scaled CRT → logical 800×600; the paddle centers on the cursor
  function onMouseMove(e: MouseEvent) {
    if (phase !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const mouseX = ((e.clientX - rect.left) * W) / rect.width;
    paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
  }

  function onBlur() {
    pause();
  }

  function onVisibilityChange() {
    if (document.hidden) pause();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibilityChange);
  canvas.addEventListener("mousemove", onMouseMove);

  initGame();
  draw();
  raf = requestAnimationFrame(loop);

  return {
    pause,
    resume,
    end,
    restart,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("mousemove", onMouseMove);
    },
  };
};

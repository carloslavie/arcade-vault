// Asteroids engine: game loop, state and input from game.js, per instance and without globals.
// The platform draws the HUD and the game over; the canvas only keeps the 3x indicator.

import type { GameFactory, GamePhase, GameStats } from "@/lib/engines/types";
import {
  Asteroid,
  Bullet,
  dist,
  H,
  type Keys,
  type Palette,
  Particle,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  PowerUp,
  rand,
  Ship,
  W,
} from "./entities";

// Keys that would scroll the page while the game listens
const CAPTURED = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);
const GLOW = 10;
const PARTICLE_GLOW = 4;

// Neon palette from :root, falling back to the current hex values
function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) =>
    css.getPropertyValue(name).trim() || fallback;
  return {
    ship: pick("--cyan", "#00f5ff"),
    asteroid: pick("--magenta", "#ff006e"),
    bullet: pick("--yellow", "#f5ff00"),
    powerUp: pick("--green", "#00ff88"),
    flame: pick("--yellow", "#f5ff00"),
  };
}

export const createAsteroidsGame: GameFactory = (canvas, callbacks) => {
  const ctx = canvas.getContext("2d")!;
  // Logic stays in 800×600; the backing store is scaled for sharp lines
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const palette = readPalette();

  // ── Input ───────────────────────────────────────────────────────────────────
  const keys: Keys = {};
  const justPressed: Keys = {};

  function pressed(code: string) {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  }

  function clearInput() {
    for (const k in keys) keys[k] = false;
    for (const k in justPressed) justPressed[k] = false;
  }

  // ── Game state ──────────────────────────────────────────────────────────────
  let phase: GamePhase = "ready";
  let ship: Ship;
  let bullets: Bullet[];
  let asteroids: Asteroid[];
  let particles: Particle[];
  let powerUps: PowerUp[];
  let score: number;
  let lives: number;
  let level: number;
  let dead: boolean; // the 2 s before respawning; counts as "playing" outside
  let deadTimer: number;
  let powerUpSpawned: boolean;
  let killsSinceSpawn: number;
  let lastStats: GameStats | null = null;
  let lastTime: number | null = null; // reset on every phase change so dt never jumps
  let raf = 0;

  function setPhase(next: GamePhase) {
    if (phase === next) return;
    phase = next;
    clearInput();
    lastTime = null;
    callbacks.onPhase(next);
  }

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

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    dead = false;
    deadTimer = 0;
    spawnAsteroids(4);
    emitStats();
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, color: string, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
  }

  function killShip() {
    explode(ship.x, ship.y, palette.ship, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      setPhase("over");
    } else {
      dead = true;
      deadTimer = 2;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (phase === "over") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }

    if (dead) {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        dead = false;
        ship.reset();
      }
      return;
    }

    // Shoot
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bullet vs asteroid
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, palette.asteroid, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Ship vs asteroid
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Level cleared
    if (phase === "playing" && asteroids.length === 0) nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function draw() {
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // Glow set once per group, not per entity
    ctx.shadowBlur = PARTICLE_GLOW;
    particles.forEach((p) => {
      ctx.shadowColor = p.color;
      p.draw(ctx);
    });

    ctx.shadowBlur = GLOW;
    ctx.shadowColor = palette.asteroid;
    asteroids.forEach((a) => a.draw(ctx, palette));
    ctx.shadowColor = palette.powerUp;
    powerUps.forEach((p) => p.draw(ctx, palette));
    ctx.shadowColor = palette.bullet;
    bullets.forEach((b) => b.draw(ctx, palette));
    ship.draw(ctx, palette);

    // Only HUD left in the canvas: the triple-shot countdown
    if (ship.tripleShot > 0) {
      ctx.shadowColor = palette.powerUp;
      ctx.fillStyle = palette.powerUp;
      ctx.font = "15px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 26);
    }
  }

  // ── Main loop ───────────────────────────────────────────────────────────────

  function loop(ts: number) {
    if (phase === "playing" || phase === "over") {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
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
    if (phase === "playing") {
      // setPhase would be a no-op, but the run still starts from scratch
      clearInput();
      lastTime = null;
    } else {
      setPhase("playing");
    }
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
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
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
    },
  };
};

// Tetris engine: game loop, state and input from game.js, per instance and without globals.
// The platform draws the HUD and the game over; the canvas keeps the board, the ghost and the next piece.

import { SCORE_LIMITS } from "@/lib/scores";
import type { GameFactory, GamePhase, GameStats } from "@/lib/engines/types";
import {
  BLOCK,
  type Board,
  BOARD_X,
  BOARD_Y,
  collide,
  COLS,
  createBoard,
  drawBlock,
  H,
  LINE_SCORES,
  type Palette,
  type Piece,
  randomPiece,
  rotateCW,
  ROWS,
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
const KICKS = [0, -1, 1, -2, 2];
const GLOW = 8;
const NEXT_SIZE = 4 * BLOCK; // 4×4 cells, like the original 120×120 preview
const NEXT_X = BOARD_X + COLS * BLOCK + 40;
const NEXT_Y = 70;

interface Theme {
  pieces: Palette;
  frame: string; // grid, board border and next box
  pixelFont: string;
}

// Neon palette from :root, falling back to the current hex values.
// Z, J, L and N have no :root var: they use the engine's own neon tones.
function readTheme(): Theme {
  const css = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) =>
    css.getPropertyValue(name).trim() || fallback;
  const cyan = pick("--cyan", "#00f5ff");
  return {
    pieces: [
      "",
      cyan, // I
      pick("--yellow", "#f5ff00"), // O
      pick("--magenta", "#ff006e"), // T
      pick("--green", "#00ff88"), // S
      "#ff3b3b", // Z - red
      "#3d7bff", // J - blue
      "#ff8a00", // L - orange
      "#9aa7b8", // N - steel gray
    ],
    frame: cyan,
    pixelFont: pick("--pixel", "monospace"),
  };
}

export const createTetrisGame: GameFactory = (canvas, callbacks) => {
  const ctx = canvas.getContext("2d")!;
  // Logic stays in 800×600; the backing store is scaled for sharp lines
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const theme = readTheme();

  // ── Game state ──────────────────────────────────────────────────────────────
  let phase: GamePhase = "ready";
  let board: Board;
  let current: Piece | null; // null in ready, until Space spawns the first piece
  let next: Piece;
  let score: number;
  let lines: number;
  let level: number;
  let dropAccum: number;
  let dropInterval: number;
  let lastStats: GameStats | null = null;
  let lastTime: number | null = null; // reset on every phase change so dt never jumps
  let raf = 0;

  function emitStats() {
    if (
      lastStats &&
      lastStats.score === score &&
      lastStats.lines === lines &&
      lastStats.level === level
    )
      return;
    lastStats = { score, lines, level };
    callbacks.onStats(lastStats);
  }

  function setPhase(nextPhase: GamePhase) {
    if (phase === nextPhase) return;
    phase = nextPhase;
    lastTime = null;
    // The platform saves the score it last heard, so the final points go out first
    if (nextPhase === "over") emitStats();
    callbacks.onPhase(nextPhase);
  }

  function addScore(points: number) {
    score = Math.min(score + points, SCORE_LIMITS.max);
  }

  function initGame() {
    board = createBoard();
    current = null;
    next = randomPiece();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    dropAccum = 0;
    emitStats();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(board, current.shape, current.x, current.y)) setPhase("over");
  }

  function merge(piece: Piece) {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[r].length; c++)
        if (piece.shape[r][c])
          board[piece.y + r][piece.x + c] = piece.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      addScore((LINE_SCORES[cleared] || 0) * level);
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }

  function lockPiece(piece: Piece) {
    merge(piece);
    clearLines();
    spawn();
  }

  function ghostY(piece: Piece) {
    let gy = piece.y;
    while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
    return gy;
  }

  // ── Actions (one per keydown, OS auto-repeat included, like the original) ──
  function move(dx: number) {
    if (current && !collide(board, current.shape, current.x + dx, current.y))
      current.x += dx;
  }

  function tryRotate() {
    if (!current) return;
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!collide(board, rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function softDrop() {
    if (!current) return;
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      addScore(1);
    } else {
      lockPiece(current);
    }
  }

  function hardDrop() {
    if (!current) return;
    const gy = ghostY(current);
    addScore((gy - current.y) * 2);
    current.y = gy;
    lockPiece(current);
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dtMs: number) {
    if (!current) return;
    dropAccum += dtMs;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1)) current.y++;
      else lockPiece(current);
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawFrame() {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = theme.frame;

    // grid
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
      ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + ROWS * BLOCK);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
      ctx.lineTo(BOARD_X + COLS * BLOCK, BOARD_Y + r * BLOCK);
    }
    ctx.stroke();

    // board border and next box
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      BOARD_X + 0.5,
      BOARD_Y + 0.5,
      COLS * BLOCK - 1,
      ROWS * BLOCK - 1,
    );
    ctx.strokeRect(NEXT_X + 0.5, NEXT_Y + 0.5, NEXT_SIZE - 1, NEXT_SIZE - 1);
    ctx.globalAlpha = 1;

    ctx.fillStyle = theme.frame;
    ctx.font = `10px ${theme.pixelFont}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("SIGUIENTE", NEXT_X, NEXT_Y - 14);
  }

  function drawNext() {
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c])
          drawBlock(
            ctx,
            NEXT_X,
            NEXT_Y,
            offX + c,
            offY + r,
            theme.pieces[shape[r][c]],
            BLOCK,
          );
  }

  function draw() {
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    drawFrame();

    // Glow set once for the placed blocks, the current piece and the preview
    ctx.shadowBlur = GLOW;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (board[r][c])
          drawBlock(
            ctx,
            BOARD_X,
            BOARD_Y,
            c,
            r,
            theme.pieces[board[r][c]],
            BLOCK,
          );

    if (current) {
      const { shape, x, y } = current;
      const gy = ghostY(current);
      ctx.shadowBlur = 0;
      for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++)
          if (shape[r][c])
            drawBlock(
              ctx,
              BOARD_X,
              BOARD_Y,
              x + c,
              gy + r,
              theme.pieces[shape[r][c]],
              BLOCK,
              0.2,
            );
      ctx.shadowBlur = GLOW;
      for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++)
          if (shape[r][c])
            drawBlock(
              ctx,
              BOARD_X,
              BOARD_Y,
              x + c,
              y + r,
              theme.pieces[shape[r][c]],
              BLOCK,
            );
    }

    drawNext();
    ctx.shadowBlur = 0;
  }

  // ── Main loop ───────────────────────────────────────────────────────────────
  function loop(ts: number) {
    if (phase === "playing") {
      const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50);
      lastTime = ts;
      update(dt);
      emitStats();
      // A lock can end the run: keep the last frame without the overlapping piece
      if (phase === "playing") draw();
    }
    raf = requestAnimationFrame(loop);
  }

  // ── Phase controls ──────────────────────────────────────────────────────────
  function start() {
    if (phase !== "ready") return;
    spawn();
    setPhase("playing");
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
    spawn();
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

    switch (e.code) {
      case "ArrowLeft":
        move(-1);
        break;
      case "ArrowRight":
        move(1);
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
      default:
        return;
    }
    emitStats();
    if (phase === "playing") draw();
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
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
};

// Contract every game engine follows so the player can mount it without knowing the game

import type { SkinId } from "@/lib/engines/skins";

export type GamePhase = "ready" | "playing" | "paused" | "over";

export interface GameStats {
  score: number;
  level: number;
  lives?: number; // asteroids
  lines?: number; // tetris
}

export interface GameCallbacks {
  onStats(stats: GameStats): void; // only when some value changes
  onPhase(phase: GamePhase): void;
}

export interface GameInstance {
  pause(): void; // playing → paused
  resume(): void; // paused → playing
  end(): void; // ready | playing | paused → over (FIN button)
  restart(): void; // any phase → playing, new run
  destroy(): void; // cancels the rAF and removes every listener
  setSkin(id: SkinId): void; // cosmetic only, any phase; redraws in ready | paused
}

export interface GameOptions {
  skin: SkinId;
}

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options: GameOptions,
) => GameInstance;

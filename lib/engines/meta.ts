// Per-game metadata the platform needs. No browser code here, so the server can import it.
import type { PlayableGameId } from "@/lib/engines/ids";

export type HudStat = "lives" | "lines" | "level";

export interface GameMeta {
  scoreStep: number; // every valid score is a multiple of this
  initialLives: number | null; // null = game without lives
  hud: HudStat[]; // HUD cells besides Jugador and Puntuación, in this order
  controls: { keys: string[]; label: string }[]; // table in the ready overlay
}

export const GAME_META: Record<PlayableGameId, GameMeta> = {
  asteroids: {
    scoreStep: 10,
    initialLives: 3,
    hud: ["lives", "level"],
    controls: [
      { keys: ["←", "→"], label: "Rotar" },
      { keys: ["↑"], label: "Propulsar" },
      { keys: ["ESPACIO"], label: "Disparar" },
      { keys: ["P", "ESC"], label: "Pausa" },
    ],
  },
  tetris: {
    scoreStep: 1,
    initialLives: null,
    hud: ["lines", "level"],
    controls: [
      { keys: ["←", "→"], label: "Mover" },
      { keys: ["↑"], label: "Rotar" },
      { keys: ["↓"], label: "Bajar" },
      { keys: ["ESPACIO"], label: "Caída" },
      { keys: ["P", "ESC"], label: "Pausa" },
    ],
  },
};

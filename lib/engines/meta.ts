// Per-game metadata the platform needs. No browser code here, so the server can import it.
import type { PlayableGameId } from "@/lib/engines/ids";

export type HudStat = "lives" | "lines" | "level";

export interface GameMeta {
  scoreStep: number; // every valid score is a multiple of this
  initialLives: number | null; // null = game without lives
  hasSkins: boolean; // shows the skin picker; true once the game registers its skins
  hud: HudStat[]; // HUD cells besides Jugador and Puntuación, in this order
  controls: { keys: string[]; label: string }[]; // table in the ready overlay
}

export const GAME_META: Record<PlayableGameId, GameMeta> = {
  asteroids: {
    scoreStep: 10,
    initialLives: 3,
    hasSkins: true,
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
    hasSkins: false,
    hud: ["lines", "level"],
    controls: [
      { keys: ["←", "→"], label: "Mover" },
      { keys: ["↑"], label: "Rotar" },
      { keys: ["↓"], label: "Bajar" },
      { keys: ["ESPACIO"], label: "Caída" },
      { keys: ["P", "ESC"], label: "Pausa" },
    ],
  },
  arkanoid: {
    scoreStep: 10,
    initialLives: 3,
    hasSkins: true,
    hud: ["lives", "level"],
    controls: [
      { keys: ["←", "→", "RATÓN"], label: "Mover" },
      { keys: ["P", "ESC"], label: "Pausa" },
    ],
  },
  snake: {
    scoreStep: 10,
    initialLives: null,
    hasSkins: true,
    hud: ["level"],
    controls: [
      { keys: ["←", "↑", "→", "↓"], label: "Mover" },
      { keys: ["P", "ESC"], label: "Pausa" },
    ],
  },
};

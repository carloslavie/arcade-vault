// Per-game metadata the platform needs. No browser code here, so the server can import it.
import type { PlayableGameId } from "@/lib/engines/ids";

export type HudStat = "lives" | "lines" | "level";

// Keys the touch gamepad can send; every engine already reads them by e.code
export type TouchKeyCode =
  "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Space";

export interface TouchButton {
  code: TouchKeyCode; // e.code the engine already reads
  label: string; // glyph or short text on the button
  aria: string; // aria-label in Spanish
  repeat?: boolean; // keyboard-like autorepeat while held
}

export interface TouchCluster {
  kind: "dpad" | "row"; // dpad places buttons by arrow code
  buttons: TouchButton[];
}

export interface GameMeta {
  scoreStep: number; // every valid score is a multiple of this
  initialLives: number | null; // null = game without lives
  hasSkins: boolean; // shows the skin picker; true once the game registers its skins
  hud: HudStat[]; // HUD cells besides Jugador and Puntuación, in this order
  controls: { keys: string[]; label: string }[]; // table in the ready overlay
  touch: { left: TouchCluster; right: TouchCluster | null }; // touch gamepad
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
    touch: {
      left: {
        kind: "row",
        buttons: [
          { code: "ArrowLeft", label: "◀", aria: "Rotar a la izquierda" },
          { code: "ArrowRight", label: "▶", aria: "Rotar a la derecha" },
        ],
      },
      right: {
        kind: "row",
        buttons: [
          { code: "ArrowUp", label: "▲", aria: "Propulsar" },
          { code: "Space", label: "●", aria: "Disparar" },
        ],
      },
    },
  },
  tetris: {
    scoreStep: 1,
    initialLives: null,
    hasSkins: true,
    hud: ["lines", "level"],
    controls: [
      { keys: ["←", "→"], label: "Mover" },
      { keys: ["↑"], label: "Rotar" },
      { keys: ["↓"], label: "Bajar" },
      { keys: ["ESPACIO"], label: "Caída" },
      { keys: ["P", "ESC"], label: "Pausa" },
    ],
    touch: {
      left: {
        kind: "dpad",
        buttons: [
          {
            code: "ArrowLeft",
            label: "◀",
            aria: "Mover a la izquierda",
            repeat: true,
          },
          { code: "ArrowDown", label: "▼", aria: "Bajar", repeat: true },
          {
            code: "ArrowRight",
            label: "▶",
            aria: "Mover a la derecha",
            repeat: true,
          },
        ],
      },
      right: {
        kind: "row",
        buttons: [
          { code: "ArrowUp", label: "↻", aria: "Rotar" },
          { code: "Space", label: "⤓", aria: "Caída" },
        ],
      },
    },
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
    touch: {
      left: {
        kind: "row",
        buttons: [
          { code: "ArrowLeft", label: "◀", aria: "Mover a la izquierda" },
          { code: "ArrowRight", label: "▶", aria: "Mover a la derecha" },
        ],
      },
      right: null, // the paddle can also be dragged on the CRT
    },
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
    touch: {
      left: {
        kind: "dpad",
        buttons: [
          { code: "ArrowUp", label: "▲", aria: "Arriba" },
          { code: "ArrowLeft", label: "◀", aria: "Izquierda" },
          { code: "ArrowRight", label: "▶", aria: "Derecha" },
          { code: "ArrowDown", label: "▼", aria: "Abajo" },
        ],
      },
      right: null,
    },
  },
};

# Porting guide — from `game.js` (or a new design) to a `GameFactory`

The reference implementation is `lib/engines/asteroids/` (port of `references/started-games/02-asteroids/game.js`, SPEC 05). Every new engine follows the same shape. The spec describes these rules; `/spec-impl` applies them.

## The contract (`lib/engines/types.ts`)

```ts
type GamePhase = "ready" | "playing" | "paused" | "over";
interface GameCallbacks {
  onStats(stats: GameStats): void;
  onPhase(phase: GamePhase): void;
}
interface GameInstance {
  pause();
  resume();
  end();
  restart();
  destroy();
}
type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameInstance;
```

The engine is plain TypeScript: no React, no Supabase, no DOM besides the canvas it receives and the `window`/`document` listeners it owns.

## File layout

- `lib/engines/<id>/entities.ts` — classes/pure helpers with the original constants. `draw(ctx, palette)` receives what it needs; no globals.
- `lib/engines/<id>/engine.ts` — `export const create<Name>Game: GameFactory`. Closure with all state, input, loop, phases, render.
- Optional `lib/engines/<id>/levels.ts` for level data. Data only, typed.

## Rules (all mandatory)

1. **Globals → instance state.** Every `let` at the top of `game.js` lives inside the factory closure. Two instances (Strict Mode double mount) must not share anything mutable.
2. **Gameplay 1:1.** Same constants, speeds, points, lives, level progression, random rules. Changes only if the user asked for them in the spec.
3. **Phases** `ready → playing ⇄ paused → over`, notified with `onPhase` only on change.
   - `ready`: the game does not advance; the platform shows the "PULSA ESPACIO PARA EMPEZAR" overlay. Space starts.
   - `paused`: P / Esc toggle; `blur` on `window` and `visibilitychange` (hidden) pause automatically. Never resume on their own.
   - `over`: last life lost, top-out, or `end()`. Space does **not** restart in `over` (the modal's JUGAR DE NUEVO calls `restart()`).
   - Internal phases of the original (`dead`, respawn, line-clear animation, level transition) count as `playing` outside.
4. **Input.** `keys` / `justPressed` per instance, using `e.code`. Listeners: `keydown`/`keyup`/`blur` on `window`, `visibilitychange` on `document`; all removed in `destroy()`. `preventDefault` only for arrows and Space, and only in `ready`/`playing`/`paused` — never in `over`. Clear input on pause, resume and restart. If the original reads `e.key`, map it to `e.code`.
5. **Loop.** One `requestAnimationFrame` per instance; `destroy()` cancels it. `dt` capped at 50 ms. Reset `lastTime` on resume/restart so there is no `dt` jump. Do not advance the simulation in `ready` or `paused`.
6. **Canvas size.** Logic in a fixed logical resolution; backing store `W * dpr × H * dpr` with `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`. CSS scales the canvas to the 4:3 `.crt-screen` (`.game-canvas` is `width/height: 100%`). If the original is not 4:3, use an 800×600 (or other 4:3) logical space and lay the board out inside it (e.g. Tetris: 300×600 board centered, next-piece preview drawn beside it) — never distort.
7. **Palette.** Read neon colours from `:root` with `getComputedStyle` once at creation, with hex fallbacks (`--cyan #00f5ff`, `--magenta #ff006e`, `--yellow #f5ff00`, `--green #00ff88`; check `app/globals.css` for the current values and any other vars). Map the original colours to the palette in the spec. Glow with `shadowBlur`, applied per group of entities, not per particle.
8. **No platform UI in the canvas.** Remove score, lives, level and any text HUD; they go out via `onStats`. Remove game-over and pause overlays and "press X" texts; the platform shows them. Keep only indicators with no HUD equivalent (Asteroids' `3x N.Ns`, Tetris' next piece).
9. **Stats.** `onStats` only when a value changes (compare against the last emitted). Score must always be a multiple of the game's `scoreStep` and ≤ 10,000,000.
10. **No external DOM.** Replace `document.getElementById` reads/writes (HUD spans, overlay divs, restart buttons, theme toggles) with callbacks or delete them. The canvas is the only element the engine gets.
11. **Debug features out.** Level-skip buttons, cheat keys, theme toggles: removed unless the spec keeps them.

## Assets and sound

- Images / sprite sheets: copy to `public/games/<id>/` and load with `new Image()` inside the factory. Stay in `ready` until loaded (or draw a loading state); never start the loop on a half-loaded sheet. `destroy()` must not leave pending callbacks touching a destroyed instance (guard with a `destroyed` flag).
- Sound: out of scope by default (SPEC 05 decision). If the user wants it, it goes in the spec explicitly: `Audio` objects per instance, muted on pause, released in `destroy()`.
- Mouse input (e.g. Arkanoid paddle): allowed if the user confirms; listeners on the canvas, coordinates converted with `getBoundingClientRect()` to the logical resolution, removed in `destroy()`.

## Known reference games

| Folder         | Notes for the spec                                                                                                                                                                                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `02-asteroids` | Already ported (`lib/engines/asteroids/`). Use as reference only.                                                                                                                                                                                                                                                                                   |
| `03-tetris`    | Canvas 300×600 + DOM panel (score, lines, level, next canvas, controls list) + DOM game-over overlay + theme toggle. Scoring `LINE_SCORES[n] * level`, soft drop `+1`, hard drop `+2` per cell → **score step 1** (needs platform preparation items 4–5). No lives (game over on top-out). Stats: score, lines, level. Keys via `e.code`, P pauses. |
| `04-arkanoid`  | Canvas 800×600, `assets/spritesheet.js` + `spritesheet-breakout.png`, `levels.js`, two mp3 sounds. `+10` per block → step 10. 3 lives. Keys via `e.key` (map to `e.code`), mouse move/click for paddle, pause screen with "Saltar al nivel" debug buttons (remove). Draws its own HUD (level, lives).                                               |

## From scratch

When there is no reference: the spec defines the rules the port would otherwise copy — constants (speeds, sizes), scoring table, lives, level progression, game-over condition, entity list — concretely enough that the acceptance criteria can test them ("comer una fruta suma 10"). Keep the first version small; extras go to later specs.

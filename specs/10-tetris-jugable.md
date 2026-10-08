# SPEC 10 — TETRIS jugable con puntuaciones y leaderboard

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 06, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-10-08
> **Objetivo:** Portar el Tetris de `references/started-games/03-tetris/` como motor TypeScript jugable en `/games/tetris/play`, con sus puntuaciones guardadas en `scores` y visibles en el leaderboard, la biblioteca y el Salón de la Fama.

---

## Por qué existe esta spec

Hoy el catálogo tiene la fila mock `caida` (CAÍDA, PUZZLE, `cover-tetro`), que describe un Tetris pero no tiene motor y no aparece en la biblioteca (SPEC 08).
Ya existe un Tetris completo (`game.js`, tablero 300×600), pero usa globals, pinta su HUD y su siguiente pieza en DOM aparte (`#score`, `#lines`, `#level`, `#next-canvas`), tiene su propio overlay de pausa y game over, y un botón de tema con `localStorage`.
Además la plataforma todavía asume Asteroids: `EnginePlayer` tiene fijos `CONTROLS` e `INITIAL_STATS` (3 vidas), `validateScore` exige múltiplos de 10 y el `CHECK` `scores_score_check` de la BD también, pero Tetris suma de 1 en 1.
Esta spec generaliza esos puntos con metadatos por juego, convierte el Tetris en un motor `GameFactory` y lo activa con `isPlayable`. El resto (`saveScore`, leaderboard, estadísticas, Salón de la Fama) ya es genérico.

---

## Alcance

**Dentro:**

- **Preparación de la plataforma:**
  - `lib/engines/meta.ts` con `GAME_META` (`scoreStep`, `initialLives`, `hud`, `controls`) y la entrada de `asteroids` con sus valores actuales.
  - `GameStats` con `lives` y `lines` opcionales: cada motor emite solo lo que tiene.
  - `EnginePlayer` lee controles, estadísticas iniciales y celdas del HUD de `GAME_META`. Las celdas Vidas, Líneas y Nivel, y las líneas NIVEL y LÍNEAS del modal de fin, se muestran según `hud`.
  - `validateScore` usa el `scoreStep` del juego (`SCORE_LIMITS` pierde `step`).
  - Migración que relaja `scores_score_check` a `score between 1 and 10000000`.
  - Asteroids se comporta exactamente igual que antes.
- **Motor de Tetris en TypeScript**, sin React, en `lib/engines/tetris/`:
  - Port 1:1 de `game.js`:
    - Tablero `COLS = 10`, `ROWS = 20`, `BLOCK = 30`.
    - Las **8 piezas** del original, incluida la tuerca `N` (anillo 3×3), elegidas con azar uniforme entre las 8.
    - Rotación horaria con wall kicks `[0, -1, 1, -2, 2]`.
    - `LINE_SCORES = [0, 100, 300, 500, 800]` × nivel, soft drop +1 por fila y hard drop +2 por celda.
    - `level = floor(lines / 10) + 1` y `dropInterval = max(100, 1000 − (level − 1) × 90)` ms.
    - Pieza fantasma con `globalAlpha = 0.2`.
    - Bloqueo inmediato al tocar fondo, tanto por gravedad como con ↓.
    - Game over cuando la pieza nueva colisiona al aparecer.
  - Las acciones de movimiento ocurren en cada `keydown` (con la autorrepetición del sistema operativo, como el original), no por frame.
  - Resolución lógica 800×600 (4:3). El tablero de 300×600 va centrado (x de 250 a 550) a toda la altura. La siguiente pieza se dibuja a la derecha del tablero, en una caja de 4×4 celdas con la etiqueta `SIGUIENTE` en `--pixel`. Buffer × `devicePixelRatio`.
  - Estética neón: I `--cyan`, O `--yellow`, T `--magenta`, S `--green`. Z, J, L y N usan tonos neón propios del motor: rojo, azul, naranja y gris acero. Glow con `shadowBlur` por grupo (tablero, pieza actual), cuadrícula tenue y borde del tablero en cian a baja opacidad. Colores de `:root` con fallback a sus hex.
  - Del HUD original en el canvas solo quedan la siguiente pieza y la pieza fantasma. Puntuación, líneas y nivel salen por `onStats`.
  - El canvas no dibuja pausa ni game over.
  - Se eliminan: el DOM externo (`#score`, `#lines`, `#level`, `#next-canvas`, `#overlay`, `#restart-btn`), el botón de tema y su `localStorage` (`tetris-theme`), y la rotación con `X`.
- **Fases** `ready → playing ⇄ paused → over`, igual que SPEC 05: Espacio empieza, y P/Esc o la pérdida de foco pausan; la partida nunca se reanuda sola. En `ready` se ve el tablero vacío y la siguiente pieza; Espacio solo empieza la partida, no hace hard drop.
- **Controles:**

  | Tecla       | Acción                          |
  | ----------- | ------------------------------- |
  | `←` / `→`   | Mover                           |
  | `↑`         | Rotar                           |
  | `↓`         | Bajar (soft drop, +1 por fila)  |
  | `Espacio`   | Caída (hard drop, +2 por celda) |
  | `P` / `Esc` | Pausa                           |

  Sin ratón ni WASD.

- **HUD React:** Jugador, Puntuación, Líneas y Nivel (sin Vidas). **Modal de fin:** PUNTUACIÓN FINAL, NIVEL y LÍNEAS.
- **Catálogo:** la fila `caida` pasa a `tetris` con título `TETRIS`, mediante una migración. Se mantienen `short`, `long`, `cat = PUZZLE`, `cover = cover-tetro`, `color = magenta`, `difficulty = 3` y `sort_order = 2`.
- **Registro:** `tetris` en `PLAYABLE_GAME_IDS`, `ENGINES` y `GAME_META` (`scoreStep: 1`, `initialLives: null`, `hud: ["lines", "level"]`).
- CSS solo para el color de la celda Líneas del HUD (`.hud-stat.lines`) y la línea LÍNEAS del modal, diseñado con `/frontend-design` siguiendo `.hud-stat.level` y `.final-level`.

**Fuera de alcance (para futuras specs):**

- Sonido (el original tampoco tiene).
- Controles táctiles y jugabilidad en móvil.
- Mejoras sobre el original: bolsa de 7 piezas, hold, varias piezas de vista previa, rotación antihoraria, SRS, lock delay, DAS/ARR propio y animación de líneas.
- Rotación con `X`, WASD o teclas configurables.
- Tema claro.
- Mostrar líneas en el leaderboard o el Salón de la Fama (solo se guarda `score`).
- Antitrampas real.
- Motor de Arkanoid.

---

## Modelo de datos

### Migración — `supabase/migrations/20261008150000_relax_scores_score_check.sql`

```sql
-- The step depends on the game (lib/engines/meta.ts); the DB only keeps the bounds.
alter table public.scores drop constraint scores_score_check;
alter table public.scores
  add constraint scores_score_check check (score between 1 and 10000000);
```

El nombre `scores_score_check` está verificado con MCP (`pg_constraint`).

### Migración — `supabase/migrations/20261008151000_rename_caida_to_tetris.sql`

```sql
-- The FK has no on update cascade, so drop it, move both sides, then restore it.
alter table public.scores drop constraint scores_game_id_fkey;

update public.games  set id = 'tetris', title = 'TETRIS' where id = 'caida';
update public.scores set game_id = 'tetris' where game_id = 'caida';

-- Sin on delete cascade: borrar un juego con puntuaciones debe fallar.
alter table public.scores
  add constraint scores_game_id_fkey
  foreign key (game_id) references public.games (id);
```

Ninguna de las dos cambia el esquema de tipos; se ejecuta igualmente `npm run db:types` para mantenerlo coherente.

### Contrato (`lib/engines/types.ts`)

```ts
export interface GameStats {
  score: number;
  level: number;
  lives?: number; // asteroids
  lines?: number; // tetris
}
```

### Metadatos (`lib/engines/meta.ts`, sin código de navegador, importable desde el servidor)

```ts
export type HudStat = "lives" | "lines" | "level";

export interface GameMeta {
  scoreStep: number; // toda puntuación válida es múltiplo de este valor
  initialLives: number | null; // null = juego sin vidas
  hud: HudStat[]; // celdas del HUD además de Jugador y Puntuación, en este orden
  controls: { keys: string[]; label: string }[]; // tabla del overlay de inicio
}

export const GAME_META: Record<PlayableGameId, GameMeta> = {
  asteroids: {
    scoreStep: 10,
    initialLives: 3,
    hud: ["lives", "level"],
    controls: [/* los 4 CONTROLS actuales de engine-player.tsx */],
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
```

`EnginePlayer` construye sus estadísticas iniciales con `{ score: 0, level: 1 }`, más `lives: initialLives` si no es `null` y `lines: 0` si `hud` incluye `lines`.

### Puntuaciones (`lib/scores.ts`)

- `SCORE_LIMITS = { min: 1, max: 10_000_000 }` (sin `step`).
- `validateScore` comprueba `score % GAME_META[gameId].scoreStep === 0` después de `isPlayable`.

### Archivos del motor

- `lib/engines/tetris/entities.ts`: `COLS`, `ROWS`, `BLOCK`, `PIECES`, `LINE_SCORES`, el mapa de color por tipo de pieza y helpers puros (`createBoard`, `randomPiece`, `collide`, `rotateCW`, `drawBlock(ctx, x, y, color, size, alpha)`). Sin globals.
- `lib/engines/tetris/engine.ts`: `createTetrisGame: GameFactory`. Contiene el estado (`board`, `current`, `next`, `score`, `lines`, `level`, `dropAccum`, `dropInterval`), el input, el bucle rAF, el bloqueo, la limpieza de líneas y el render del tablero y de la siguiente pieza.

### Puntuación

| Acción                         | Puntos      |
| ------------------------------ | ----------- |
| 1 línea                        | 100 × nivel |
| 2 líneas                       | 300 × nivel |
| 3 líneas                       | 500 × nivel |
| 4 líneas                       | 800 × nivel |
| Soft drop (↓), por fila        | 1           |
| Hard drop (Espacio), por celda | 2           |

El multiplicador es el nivel antes de sumar las líneas nuevas, como en el original. `scoreStep = 1`. El motor limita la puntuación a 10.000.000.

---

## Plan de implementación

1. **Preparación de la plataforma.**
   - Crear `lib/engines/meta.ts` con la entrada `asteroids` (todavía sin `tetris`).
   - Hacer `lives` opcional y añadir `lines?` en `GameStats`.
   - `EnginePlayer` lee `GAME_META[game.id]` para controles, estadísticas iniciales, celdas del HUD y líneas del modal.
   - `validateScore` usa `scoreStep`; quitar `step` de `SCORE_LIMITS`.
   - Crear y aplicar `20261008150000_relax_scores_score_check.sql` con `npx supabase db push`, y luego `npm run db:types`.
   - Verificar: `npm run build` pasa, Asteroids se ve y juega igual, y `saveScore({ gameId: "asteroids", score: 15 })` devuelve `invalid`.
2. **Migración del catálogo.** Crear y aplicar `20261008151000_rename_caida_to_tetris.sql`. Verificar con MCP `execute_sql` que `games` tiene `tetris` / `TETRIS` con `sort_order = 2` y que no queda `caida`.
3. **Motor.** Leer `.claude/skills/add-game/porting-guide.md`. Portar `game.js` a `lib/engines/tetris/entities.ts` y `engine.ts`:
   - Layout 800×600 con el tablero centrado y la siguiente pieza a la derecha.
   - Input por `keydown` con `e.code`. `preventDefault` en flechas y Espacio solo en `ready`, `playing` y `paused`.
   - `onStats` con `score`, `lines` y `level` solo cuando cambian.
   - Se eliminan el DOM externo, el tema y `X`.
4. **Registro.** Añadir `tetris` a `PLAYABLE_GAME_IDS`, `ENGINES` (`createTetrisGame`) y `GAME_META`. Verificar: `/games/tetris/play` monta el motor con el overlay y los controles de Tetris.
5. **UI.** Ejecutar `/frontend-design` para `.hud-stat.lines` y la línea LÍNEAS del modal, siguiendo `.hud-stat.level` y `.final-level` en `app/globals.css`.
6. **Cierre.** Partida como invitado y otra con sesión. Comprobación con MCP. Recorrer los criterios de aceptación. `npm run lint` y `npm run build`.

---

## Criterios de aceptación

Generales de integración:

- [x] `npm run build` termina sin errores ni warnings de tipos.
- [x] `npm run lint` termina sin errores.
- [x] La consola no muestra errores ni avisos de hidratación en `/games`, `/games/tetris`, `/games/tetris/play` y `/hall-of-fame`.
- [x] `/games` muestra la tarjeta de TETRIS (antes que ASTEROIDS, por `sort_order`) y `/hall-of-fame` su pestaña.
- [x] `/games/caida` devuelve la página 404.
- [x] `/games/tetris/play` muestra el canvas en la CRT con el overlay de inicio y los 5 controles de Tetris. El juego no avanza hasta pulsar Espacio.
- [x] El canvas se ve nítido con `devicePixelRatio` 2 y sin deformar: las celdas son cuadradas y el tablero está centrado.
- [x] El canvas no dibuja puntuación, líneas, nivel, pausa ni game over. Solo dibuja el tablero, la pieza fantasma y la siguiente pieza.
- [x] Flechas y Espacio no hacen scroll durante la partida.
- [x] P, Esc y el botón PAUSA pausan y reanudan. Cambiar de pestaña o salir de la ventana pausa la partida y no se reanuda sola.
- [x] El HUD React muestra Jugador, Puntuación, Líneas y Nivel, sin Vidas, y se actualiza durante la partida.
- [x] Que una pieza nueva colisione al aparecer abre el modal con PUNTUACIÓN FINAL, NIVEL y LÍNEAS.
- [x] Con sesión, el modal pasa a `▸ PUNTUACIÓN GUARDADA_` y `select * from scores order by id desc limit 1` devuelve `game_id = 'tetris'` con esa puntuación.
- [x] Una puntuación no múltiplo de 10 (p. ej. 123) se guarda sin error.
- [x] Una partida produce una sola fila en `scores` (también con Strict Mode).
- [x] Sin sesión, el modal invita a iniciar sesión y no se inserta nada.
- [x] Tras guardar, `/games/tetris` muestra la marca en el leaderboard y en las estadísticas.
- [x] `saveScore({ gameId: "tetris", score: 0 })` devuelve `invalid`.
- [x] JUGAR DE NUEVO empieza una partida nueva directamente con puntuación 0, 0 líneas y nivel 01.
- [x] SALIR y VOLVER AL VAULT desmontan el juego: las flechas vuelven a hacer scroll y no queda ningún `requestAnimationFrame`.
- [x] Emulando un dispositivo táctil, se muestra "REQUIERE TECLADO" y no arranca el motor.
- [x] `get_advisors` (security y performance) no muestra avisos nuevos.

Preparación de la plataforma:

- [x] Asteroids sigue igual: los mismos 4 controles, HUD con Vidas y Nivel (sin Líneas), modal con NIVEL (sin LÍNEAS) y `saveScore({ gameId: "asteroids", score: 15 })` devuelve `invalid`.
- [x] `select pg_get_constraintdef(oid) from pg_constraint where conname = 'scores_score_check'` ya no contiene `% 10`.
- [x] `grep -rn "INITIAL_STATS\|const CONTROLS" components` no devuelve resultados.

Jugabilidad:

- [x] Completar 1, 2, 3 y 4 líneas a la vez en el nivel 1 suma 100, 300, 500 y 800 respectivamente.
- [x] Completar 4 líneas a la vez en el nivel 2 suma 1.600.
- [x] Cada pulsación de ↓ que baja la pieza una fila suma 1. Con ↓ mantenido la pieza baja con la autorrepetición del teclado.
- [x] Espacio deja caer la pieza al fondo al instante y suma 2 por cada celda recorrida.
- [x] Al llegar a 10 líneas el HUD pasa a NIVEL 02 y la caída automática pasa de 1000 ms a 910 ms por fila.
- [x] ↑ rota en sentido horario. Junto a la pared, la pieza se desplaza hasta 2 columnas para poder rotar.
- [x] La pieza fantasma muestra dónde aterrizará la pieza actual.
- [x] La siguiente pieza dibujada a la derecha es la que aparece después.
- [x] Aparece la pieza tuerca (anillo 3×3 en gris acero).
- [x] I cian, O amarilla, T magenta y S verde. Z, J, L y la tuerca tienen cada una un color distinto de las demás.

---

## Decisiones

- **Sí:** motor TypeScript sin React con el contrato `GameFactory` de SPEC 05. React solo monta el canvas y escucha callbacks.
- **Sí:** reutilizar `scores`, `saveScore`, `get_leaderboard` y las estadísticas existentes. Se activan con `isPlayable`.
- **No:** tabla, acción o función de ranking propias del juego.
- **Sí:** renombrar la fila `caida` a `tetris` / `TETRIS`, con el mismo patrón que `rocas → asteroids`. Sus textos, portada y categoría ya describen este juego.
- **No:** fila nueva (dejaría un CAÍDA mock duplicado) ni mantener el id `caida` (la URL no coincidiría con el título).
- **Sí:** jugabilidad 1:1 con `game.js`, incluida la pieza tuerca y el azar uniforme. Esta spec es de integración, no de diseño de juego.
- **Sí:** movimiento por `keydown` con la autorrepetición del sistema, como el original. Un DAS propio sería una mejora sobre el original.
- **Sí:** 8 tonos neón distintos. Las 4 variables de `:root` cubren I, O, T y S; Z, J, L y la tuerca usan constantes del motor para que cada pieza se distinga.
- **No:** solo las 4 variables de `:root` (piezas distintas compartirían color).
- **Sí:** quitar `X` como rotación alternativa y añadir `Esc` como pausa. Mismo esquema que Asteroids: flechas, Espacio y P/Esc.
- **Sí:** HUD y game over en la plataforma. En el canvas quedan la siguiente pieza y la pieza fantasma, que no tienen equivalente en el HUD.
- **Sí:** Líneas en el HUD y en el modal. Es la estadística propia del Tetris y explica el nivel.
- **No:** guardar líneas en `scores` (sería una columna por juego).
- **Sí:** `scoreStep` por juego en `GAME_META` y `CHECK` de la BD reducido a los límites. Tetris suma 1 por fila de soft drop, y Asteroids sigue rechazando valores no múltiplos de 10.
- **No:** quitar el paso para todos los juegos (Asteroids aceptaría puntuaciones imposibles).
- **Sí:** `lives` opcional en `GameStats` en lugar de que Tetris emita `lives: 0`. El HUD decide qué mostrar con `hud`, no con valores falsos.
- **Sí:** preparación de la plataforma y Tetris en una sola spec. Tetris no tiene assets ni sonido, y la preparación solo tiene sentido con un segundo juego. Va como paso 1 con verificación propia de Asteroids.
- **Sí:** límite de 10.000.000 en el motor. Es el máximo que acepta `scores`; el original no tiene límite.
- **No:** sonido, ratón, tema claro. El original no tiene sonido; el tema lo fija la plataforma.

---

## Riesgos

| Riesgo                                                                        | Mitigación                                                                                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| La preparación de la plataforma rompe Asteroids                               | Paso 1 propio con verificación de Asteroids (HUD, controles, `invalid` con 15) antes de tocar Tetris.         |
| Strict Mode monta dos veces el motor                                          | `destroy()` cancela el rAF y quita listeners; el guardado va ligado al id de partida.                         |
| El original no es 4:3                                                         | Tablero 300×600 centrado en un espacio lógico 800×600, sin deformar.                                          |
| La autorrepetición del teclado hace preventDefault o mueve piezas tras pausar | Las acciones solo se aplican en `playing`; el input se limpia al pausar, reanudar y reiniciar.                |
| El renombrado de `caida` falla por la FK                                      | Mismo patrón probado en `rocas → asteroids`: quitar la FK, mover ambos lados y restaurarla.                   |
| El `CHECK` relajado deja entrar en la BD valores que antes se rechazaban      | `validateScore` sigue aplicando el `scoreStep` del juego antes de insertar; el antitrampas real es otra spec. |
| `/hall-of-fame` sin `?game` pasa a abrir TETRIS en lugar de ASTEROIDS         | Comportamiento esperado de SPEC 09 (primer juego jugable por `sort_order`). Se acepta.                        |

---

## Lo que **no** entra en esta spec

- Sonido.
- Controles táctiles.
- Mejoras sobre el original (bolsa de 7, hold, SRS, lock delay, DAS propio, animaciones).
- `X`, WASD o teclas configurables.
- Tema claro.
- Líneas en rankings.
- Antitrampas real.
- Motor de Arkanoid.

Cada uno de estos puntos, si llega, va en su propia spec.

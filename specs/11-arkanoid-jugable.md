# SPEC 11 — ARKANOID jugable con puntuaciones y leaderboard

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 06, SPEC 10
> **Fecha:** 2026-10-08
> **Objetivo:** Portar el Arkanoid de `references/started-games/04-arkanoid/` como motor TypeScript jugable en `/games/arkanoid/play`, con sus puntuaciones guardadas en `scores` y visibles en el leaderboard, la biblioteca y el Salón de la Fama.

---

## Por qué existe esta spec

Hoy el catálogo tiene la fila mock `bloque-buster` (BLOQUE BUSTER, ARCADE, `cover-bricks`), que describe un Arkanoid pero no tiene motor y no aparece en la biblioteca (SPEC 08).
Ya existe un Arkanoid completo (`game.js`, `levels.js`, canvas 800×600), pero usa globals y pinta su propio HUD (score, nivel, vidas) y sus overlays de pausa y game over.
Además carga un spritesheet pixel-art y dos mp3, y su pausa tiene botones de depuración para saltar de nivel.
La plataforma ya es genérica desde SPEC 10 (`GAME_META`, `scoreStep` por juego, HUD según `hud`), así que esta spec solo convierte el juego en un motor `GameFactory`, renombra la fila del catálogo y lo activa con `isPlayable`.
El resto (`saveScore`, leaderboard, estadísticas, Salón de la Fama) se activa sin código nuevo.

---

## Alcance

**Dentro:**

- **Motor de Arkanoid en TypeScript**, sin React, en `lib/engines/arkanoid/`:
  - Port 1:1 de `game.js` y `levels.js`:
    - Canvas lógico `W = 800`, `H = 600`.
    - Paleta de 81×14 en `y = 560`, centrada al empezar, `PADDLE_SPEED = 400` px/s, limitada a los bordes.
    - Pelota de 16×16 con velocidad base `vx = 200`, `vy = −300` px/s, multiplicada por la velocidad del nivel.
    - Rebotes en las paredes izquierda, derecha y superior.
    - Rebote en la paleta solo si la pelota baja (`vy > 0`) y su borde inferior está entre `paddle.y` y `paddle.y + paddle.h + 8`: invierte `vy` y no cambia `vx`.
    - Bloques de 64×24 en una rejilla de 10×6 con origen `x = 80`, `y = 80`.
    - Colisión AABB con un solo bloque por frame: el bloque muere, suma 10 e invierte `vy`.
    - Explosión de 150 ms en 4 fotogramas en el sitio del bloque.
    - 3 vidas. Si la pelota pasa de `y > 600` se pierde una vida y la pelota se recoloca encima de la paleta (sin recentrar la paleta) y sale hacia arriba al instante.
    - Al romper el último bloque se carga el nivel siguiente al instante: pelota encima de la paleta con la velocidad del nuevo nivel y explosiones borradas.
    - Al limpiar el nivel 5 la partida termina.
  - Los 5 niveles de `levels.js`, con los mismos patrones, colores por fila y velocidades:

    | Nivel | Patrón                 | Bloques | Velocidad |
    | ----- | ---------------------- | ------- | --------- |
    | 1     | Parrilla completa 10×6 | 60      | ×1.00     |
    | 2     | Pirámide               | 40      | ×1.10     |
    | 3     | Ajedrez                | 30      | ×1.21     |
    | 4     | Filas con huecos       | 39      | ×1.33     |
    | 5     | Marco + cruz central   | 39      | ×1.46     |

  - Resolución lógica 800×600, ya 4:3: ocupa toda la CRT sin bandas. Buffer × `devicePixelRatio`.
  - Estética neón vectorial, sin assets:
    - Fondo `#000`.
    - Paleta `--cyan` y pelota `--ink`.
    - Bloques por color del original: `cyan → --cyan`, `yellow → --yellow`, `magenta → --magenta`, `green → --green`. `red`, `hotpink` y `gray` usan tonos neón propios del motor: `#ff3b3b`, `#ff5ec8` y `#9aa7b8` (los mismos rojo y gris acero que Tetris).
    - Bloques dibujados con 2 px de separación entre ellos.
    - La explosión es el bloque en su color, que crece y se desvanece en 4 pasos de 37,5 ms (alpha 1, 0.75, 0.5, 0.25).
    - Glow con `shadowBlur` por grupo (bloques, paleta, pelota, explosiones). Colores de `:root` con fallback a sus hex.
  - El canvas no dibuja HUD: puntuación, vidas y nivel salen por `onStats`.
  - El canvas no dibuja pausa, game over ni "¡Completaste el juego!".
  - Se eliminan: el spritesheet y `spritesheet.js`, los sonidos, el overlay de pausa con los botones "Saltar al nivel" y su listener de `click`.
- **Fases** `ready → playing ⇄ paused → over`, igual que SPEC 05: Espacio empieza, y P/Esc o la pérdida de foco pausan; la partida nunca se reanuda sola.
  - En `ready` se ven los bloques del nivel 1, la paleta centrada y la pelota encima, quietos.
  - La pérdida de vida y el cambio de nivel cuentan como `playing`.
  - Perder la última vida, limpiar el nivel 5 o pulsar FIN pasan a `over`.
- **Controles:**

  | Entrada     | Acción                    |
  | ----------- | ------------------------- |
  | `←` / `→`   | Mover                     |
  | Ratón       | Mover                     |
  | `P` / `Esc` | Pausa                     |
  | `Espacio`   | Empezar (solo en `ready`) |
  - Teclas por `e.code` (`ArrowLeft`, `ArrowRight`, `KeyP`, `Escape`, `Space`).
  - Ratón: `mousemove` sobre el canvas, convertido a coordenadas lógicas con `getBoundingClientRect()`. La paleta se centra en el cursor y se limita a los bordes. Solo se aplica en `playing`. El clic no hace nada.
  - Sin WASD.

- **HUD React:** Jugador, Puntuación, Vidas y Nivel (sin Líneas), como Asteroids. **Modal de fin:** PUNTUACIÓN FINAL y NIVEL, el mismo también al completar el juego.
- **Catálogo:** la fila `bloque-buster` pasa a `arkanoid` con título `ARKANOID`, mediante una migración. Se mantienen `short`, `long`, `cat = ARCADE`, `cover = cover-bricks`, `color = cyan`, `difficulty = 2` y `sort_order = 1`.
- **Registro:** `arkanoid` en `PLAYABLE_GAME_IDS`, `ENGINES` y `GAME_META` (`scoreStep: 10`, `initialLives: 3`, `hud: ["lives", "level"]`).
- Sin CSS nuevo: `.cover-bricks`, `.hud-stat.lives`, `.hud-stat.level` y `.final-level` ya existen.

**Fuera de alcance (para futuras specs):**

- Sonido (los mp3 del original no se copian).
- Sprites del original (`spritesheet-breakout.png`).
- Controles táctiles y jugabilidad en móvil.
- Mejoras sobre el original: ángulo de rebote según el punto de impacto, lanzar la pelota con Espacio, power-ups, bloques con varios golpes, bucle de niveles tras el 5.
- Modal o título de victoria distinto al completar el juego.
- Selector de nivel o cualquier atajo de depuración.
- WASD o teclas configurables.
- Antitrampas real.

---

## Modelo de datos

### Migración — `supabase/migrations/20261008160000_rename_bloque_buster_to_arkanoid.sql`

```sql
-- The FK has no on update cascade, so drop it, move both sides, then restore it.
alter table public.scores drop constraint scores_game_id_fkey;

update public.games  set id = 'arkanoid', title = 'ARKANOID' where id = 'bloque-buster';
update public.scores set game_id = 'arkanoid' where game_id = 'bloque-buster';

-- Sin on delete cascade: borrar un juego con puntuaciones debe fallar.
alter table public.scores
  add constraint scores_game_id_fkey
  foreign key (game_id) references public.games (id);
```

No cambia el esquema: no hace falta `npm run db:types`.

### Metadatos (`lib/engines/meta.ts`, entrada nueva)

```ts
arkanoid: {
  scoreStep: 10,
  initialLives: 3,
  hud: ["lives", "level"],
  controls: [
    { keys: ["←", "→", "RATÓN"], label: "Mover" },
    { keys: ["P", "ESC"], label: "Pausa" },
  ],
},
```

Las etiquetas de `controls` no se repiten porque `EnginePlayer` las usa como `key`.

### Archivos del motor

- `lib/engines/arkanoid/levels.ts`: `LEVELS: { speed: number; blocks: { col: number; row: number; color: BlockColor }[] }[]`, generado con los mismos patrones de `levels.js`. Solo datos, tipado. `BlockColor = "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray"`.
- `lib/engines/arkanoid/entities.ts`: constantes (`W`, `H`, `PADDLE_*`, `BALL_*`, `BLOCK_*`, `BLOCKS_ORIGIN_*`, `BASE_BALL_VX`, `BASE_BALL_VY`, `EXPLOSION_DURATION`) y helpers puros (`collideAABB`, `drawBlock`, `drawExplosion`, `drawPaddle`, `drawBall`), que reciben el color o la paleta. Sin globals.
- `lib/engines/arkanoid/engine.ts`: `createArkanoidGame: GameFactory`. Contiene el estado (`paddle`, `ball`, `blocks`, `explosions`, `score`, `lives`, `level`), el input de teclado y ratón, el bucle rAF, las colisiones, el cambio de nivel y el render.

### Puntuación

| Acción        | Puntos |
| ------------- | ------ |
| Romper bloque | 10     |

`scoreStep = 10`. Los 5 niveles suman 208 bloques, así que el máximo real es 2.080 (muy por debajo de 10.000.000).

---

## Plan de implementación

1. **Migración del catálogo.** Crear y aplicar `20261008160000_rename_bloque_buster_to_arkanoid.sql` con `npx supabase db push`. Verificar con MCP `execute_sql` que `games` tiene `arkanoid` / `ARKANOID` con `sort_order = 1` y que no queda `bloque-buster`. Hasta el paso 3, `/games/arkanoid` funciona como juego mock.
2. **Niveles y entidades.** Leer `.claude/skills/add-game/porting-guide.md`. Crear `lib/engines/arkanoid/levels.ts` y `entities.ts` con las constantes del original y el mapa de colores neón. Verificar: `npm run build` pasa y `LEVELS` tiene 60, 40, 30, 39 y 39 bloques.
3. **Motor.** Crear `lib/engines/arkanoid/engine.ts` con `createArkanoidGame`:
   - Fases, pausa por `blur` / `visibilitychange`, `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar y reiniciar.
   - Teclado por `e.code` en `window`. `preventDefault` en flechas y Espacio solo en `ready`, `playing` y `paused`. Input limpio al pausar, reanudar y reiniciar.
   - `mousemove` en el canvas, aplicado solo en `playing`.
   - `onStats` con `score`, `lives` y `level` solo cuando cambian.
   - `destroy()` cancela el rAF y quita todos los listeners (también el del ratón).
4. **Registro.** Añadir `arkanoid` a `PLAYABLE_GAME_IDS`, `ENGINES` (`createArkanoidGame`) y `GAME_META`. Verificar: `/games/arkanoid/play` monta el motor con el overlay de inicio y los controles de Arkanoid.
5. **Cierre.** Partida como invitado y otra con sesión. Comprobación con MCP. Recorrer los criterios de aceptación. `npm run lint` y `npm run build`.

---

## Criterios de aceptación

Generales de integración:

- [x] `npm run build` termina sin errores ni warnings de tipos.
- [x] `npm run lint` termina sin errores.
- [x] La consola no muestra errores ni avisos de hidratación en `/games`, `/games/arkanoid`, `/games/arkanoid/play` y `/hall-of-fame`.
- [x] `/games` muestra la tarjeta de ARKANOID (la primera, por `sort_order`) y `/hall-of-fame` su pestaña.
- [x] `/games/bloque-buster` devuelve la página 404.
- [x] `/games/arkanoid/play` muestra el canvas en la CRT con el overlay de inicio y los 2 controles de Arkanoid. El juego no avanza hasta pulsar Espacio.
- [ ] El canvas se ve nítido con `devicePixelRatio` 2 y sin deformar: la pelota es cuadrada y la rejilla de bloques está centrada.
- [x] El canvas no dibuja puntuación, vidas, nivel, pausa, game over ni texto de victoria.
- [x] Flechas y Espacio no hacen scroll durante la partida.
- [x] P, Esc y el botón PAUSA pausan y reanudan. Cambiar de pestaña o salir de la ventana pausa la partida y no se reanuda sola.
- [x] El HUD React muestra Jugador, Puntuación, Vidas (`♥ ♥ ♥`) y Nivel, sin Líneas, y se actualiza durante la partida.
- [x] Perder la última vida abre el modal con PUNTUACIÓN FINAL y NIVEL, sin LÍNEAS.
- [x] Con sesión, el modal pasa a `▸ PUNTUACIÓN GUARDADA_` y `select * from scores order by id desc limit 1` devuelve `game_id = 'arkanoid'` con esa puntuación.
- [x] Una partida produce una sola fila en `scores` (también con Strict Mode).
- [ ] Sin sesión, el modal invita a iniciar sesión y no se inserta nada.
- [x] Tras guardar, `/games/arkanoid` muestra la marca en el leaderboard y en las estadísticas.
- [x] `saveScore({ gameId: "arkanoid", score: 15 })` devuelve `invalid`.
- [x] JUGAR DE NUEVO empieza una partida nueva directamente con puntuación 0, 3 vidas, nivel 01 y la paleta centrada.
- [x] SALIR y VOLVER AL VAULT desmontan el juego: las flechas vuelven a hacer scroll, no queda ningún `requestAnimationFrame` y mover el ratón no lanza errores.
- [ ] Emulando un dispositivo táctil, se muestra "REQUIERE TECLADO" y no arranca el motor.
- [x] `get_advisors` (security y performance) no muestra avisos nuevos.
- [ ] Asteroids y Tetris siguen igual (controles, HUD y guardado).

Jugabilidad:

- [x] Romper un bloque suma exactamente 10.
- [x] El nivel 1 tiene 60 bloques en 6 filas de 10, de arriba abajo rojo, amarillo, cian, magenta, rosa y verde.
- [ ] Al romper el último bloque del nivel 1 el HUD pasa a NIVEL 02, aparece la pirámide de 40 bloques y la pelota sale desde la paleta un 10 % más rápida.
- [ ] El nivel 5 muestra un marco cian con una cruz rosa en el centro.
- [ ] Completar los 5 niveles abre el modal con PUNTUACIÓN FINAL 2.080 y NIVEL 05.
- [x] Si la pelota cae por abajo con 3 vidas, el HUD pasa a 2 vidas y la pelota sale al instante hacia arriba desde encima de la paleta.
- [ ] El rebote en la paleta no cambia la dirección horizontal de la pelota.
- [ ] Con ← o → mantenido la paleta se mueve a 400 px/s lógicos y se detiene en los bordes.
- [ ] Mover el ratón sobre el canvas durante `playing` centra la paleta en el cursor, también con la CRT escalada. En `ready` y `paused` el ratón no la mueve.
- [ ] Al romper un bloque se ve una explosión de su color que dura 150 ms.
- [x] Cada color del original se distingue: cian, amarillo, magenta y verde salen de `:root`; rojo, rosa y gris son tonos propios.
- [x] Hacer clic en el canvas en pausa no cambia de nivel.

---

## Decisiones

- **Sí:** motor TypeScript sin React con el contrato `GameFactory` de SPEC 05. React solo monta el canvas y escucha callbacks.
- **Sí:** reutilizar `scores`, `saveScore`, `get_leaderboard` y las estadísticas existentes. Se activan con `isPlayable`.
- **No:** tabla, acción o función de ranking propias del juego.
- **Sí:** renombrar la fila `bloque-buster` a `arkanoid` / `ARKANOID`, con el mismo patrón que `rocas → asteroids` y `caida → tetris`. Sus textos, portada y categoría ya describen este juego.
- **No:** fila nueva (dejaría un BLOQUE BUSTER mock duplicado) ni mantener el id `bloque-buster` (la URL no coincidiría con el título).
- **Sí:** jugabilidad 1:1 con `game.js` y `levels.js`, incluido el rebote sin ángulo y el relanzamiento automático. Esta spec es de integración, no de diseño de juego.
- **No:** ángulo según el punto de impacto ni lanzar con Espacio. Son mejoras sobre el original.
- **Sí:** neón vectorial en lugar de los sprites. Es coherente con Asteroids y Tetris, no añade assets y evita la atribución del spritesheet.
- **No:** sprites originales ni un híbrido. El pixel-art pastel desentona con la CRT neón.
- **Sí:** 7 colores distintos para los bloques. Las 4 variables de `:root` cubren cian, amarillo, magenta y verde; rojo, rosa y gris usan constantes del motor, reutilizando el rojo y el gris de Tetris.
- **Sí:** ratón además de flechas, como el original. Solo en `playing`, para que la paleta no se mueva con el juego pausado (en el original sí se movía).
- **No:** sonido. Mismo criterio que SPEC 05; el audio irá en su propia spec para todos los juegos.
- **No:** botones "Saltar al nivel" en la pausa. Son de depuración y permitirían inflar la puntuación.
- **Sí:** completar el juego termina en `over` con el modal genérico. No hace falta cambiar el contrato ni los otros motores.
- **No:** modal de victoria propio. Requeriría ampliar `GamePhase` o `onPhase` en todos los motores.
- **Sí:** `dt` limitado a 50 ms. Lo exige la guía de porteo; el original no lo limitaba y la pelota podía atravesar bloques tras un tirón.
- **No:** CSS nuevo ni paso de `/frontend-design`. La portada `.cover-bricks` y las celdas Vidas y Nivel ya existen.

---

## Riesgos

| Riesgo                                                                              | Mitigación                                                                                                                             |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta dos veces el motor                                                | `destroy()` cancela el rAF y quita listeners de teclado, ratón, `blur` y `visibilitychange`; el guardado va ligado al id de partida.   |
| El ratón da coordenadas en píxeles CSS de una CRT escalada                          | Convertir con `getBoundingClientRect()` a la resolución lógica 800×600.                                                                |
| Con la pelota rápida (nivel 5) un frame lento la hace atravesar bloques o la paleta | `dt` limitado a 50 ms; a ×1.46 la pelota avanza como mucho unos 22 px en vertical por frame, menos que la altura de un bloque (24 px). |
| El renombrado de `bloque-buster` falla por la FK                                    | Mismo patrón probado en `rocas → asteroids` y `caida → tetris`: quitar la FK, mover ambos lados y restaurarla.                         |
| `/hall-of-fame` sin `?game` pasa a abrir ARKANOID en lugar de TETRIS                | Comportamiento esperado de SPEC 09 (primer juego jugable por `sort_order`). Se acepta.                                                 |
| El overlay de la CRT tapa el canvas en `ready` y `paused`                           | El ratón solo se usa en `playing`, cuando no hay overlay.                                                                              |

---

## Lo que **no** entra en esta spec

- Sonido.
- Sprites del original.
- Controles táctiles.
- Mejoras sobre el original (ángulo de rebote, lanzar con Espacio, power-ups, bloques duros, bucle de niveles).
- Modal de victoria.
- Selector de nivel y atajos de depuración.
- WASD o teclas configurables.
- Antitrampas real.

Cada uno de estos puntos, si llega, va en su propia spec.

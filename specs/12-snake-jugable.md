# SPEC 12 — SNAKE jugable con puntuaciones y leaderboard

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06, SPEC 10
> **Fecha:** 2026-10-08
> **Objetivo:** Crear un Snake nuevo, con las frutas pixel-art de `references/source-assets/snake-assets/`, como motor TypeScript jugable en `/games/snake/play`, con sus puntuaciones guardadas en `scores` y visibles en el leaderboard, la biblioteca y el Salón de la Fama.

---

## Por qué existe esta spec

Hoy el catálogo tiene la fila mock `serpentina` (SERPENTINA, ARCADE, `cover-snake`), que describe un Snake pero no tiene motor y no aparece en la biblioteca (SPEC 08).
A diferencia de Asteroids, Tetris y Arkanoid, no hay un `game.js` que portar.
La referencia es solo una hoja de sprites (`fruits.png`, 3790×442, 22 frutas en tres estilos) y su atlas (`sprites.js`), que recorta la fila pixel-art.
Por eso esta spec fija todas las reglas del juego: tablero, velocidad, puntuación, niveles y condición de fin.
La plataforma ya es genérica desde SPEC 10 (`GAME_META`, `scoreStep` por juego, HUD según `hud`).
Esta spec solo crea el motor, copia el sprite, renombra la fila del catálogo y lo activa con `isPlayable`.
El resto (`saveScore`, leaderboard, estadísticas, Salón de la Fama) se activa sin código nuevo.

---

## Alcance

**Dentro:**

- **Motor de Snake en TypeScript**, sin React, en `lib/engines/snake/`:
  - Canvas lógico `W = 800`, `H = 600`, ya 4:3: ocupa toda la CRT sin bandas. Buffer × `devicePixelRatio`.
  - Tablero de `COLS = 32` × `ROWS = 24` celdas de `CELL = 25` px. Los bordes del canvas son las paredes.
  - Serpiente inicial de 3 segmentos: cabeza en `(16, 12)`, cuerpo en `(15, 12)` y `(14, 12)`, dirección derecha.
  - Movimiento por pasos de una celda. Velocidad `8 + (nivel − 1)` pasos/s, con tope de 20 (se alcanza en el nivel 13).
  - El paso se acumula con el `dt` del rAF (limitado a 50 ms): se avanza un paso cada `1000 / velocidad` ms.
  - Comer una fruta suma 10 y hace crecer la serpiente un segmento (en ese paso la cola no avanza).
  - Cada 5 frutas comidas sube un nivel: `nivel = floor(frutas / 5) + 1`.
  - La fruta aparece en una celda libre al azar (nunca sobre la serpiente) y elige al azar uno de los 22 sprites del atlas. Todas valen 10.
  - Mover la cabeza a la celda que la cola deja libre en ese mismo paso es legal, salvo si en ese paso la serpiente crece.
  - Chocar con una pared o con el propio cuerpo termina la partida. No hay vidas.
  - Si tras comer no queda ninguna celda libre (serpiente de 768 segmentos), la partida termina.
- **Estética:** serpiente neón vectorial y frutas pixel-art.
  - Fondo `#000` con una rejilla tenue de 1 px en `--green` con alpha 0,08.
  - Cuerpo en `--green` y cabeza en `--ink`, cada segmento un cuadrado de 25 px con 2 px de margen interior. Glow con `shadowBlur` aplicado una vez para todo el cuerpo.
  - La fruta se dibuja con `drawImage` desde el sprite, centrada en su celda y escalada para caber en 25×25 sin deformar (mantiene la proporción del recorte). `imageSmoothingEnabled = false` para conservar el pixel-art.
  - Si el sprite no carga, la fruta se dibuja como un núcleo circular `--magenta` con glow.
  - Colores de `:root` con fallback a sus hex.
  - El canvas no dibuja HUD: puntuación y nivel salen por `onStats`.
  - El canvas no dibuja pausa ni game over.
- **Assets** en `public/games/snake/fruits.png`: solo la fila pixel-art de la hoja original (`y = 136–295`), recortada a 3790×160.
  - El recorte se hace una vez con un script puntual que no se commitea. La referencia no se modifica.
  - El atlas pasa a `lib/engines/snake/sprites.ts` con las 22 frutas y `y = 0`, conservando el comentario con el origen de la imagen.
  - El motor carga la imagen con `new Image()` dentro de la factory. Un flag `destroyed` evita que `onload` / `onerror` toquen una instancia destruida.
- **Fases** `ready → playing ⇄ paused → over`, igual que SPEC 05: Espacio empieza, y P/Esc o la pérdida de foco pausan; la partida nunca se reanuda sola.
  - En `ready` se ven la serpiente inicial y la primera fruta, quietas.
  - Espacio solo empieza cuando la imagen ha cargado o ha fallado (con fallo se usa el núcleo `--magenta`).
  - Chocar, llenar el tablero o pulsar FIN pasan a `over`.
- **Controles:**

  | Entrada               | Acción                    |
  | --------------------- | ------------------------- |
  | `←` / `↑` / `→` / `↓` | Cambiar de dirección      |
  | `P` / `Esc`           | Pausa                     |
  | `Espacio`             | Empezar (solo en `ready`) |
  - Teclas por `e.code` (`ArrowLeft`, `ArrowUp`, `ArrowRight`, `ArrowDown`, `KeyP`, `Escape`, `Space`).
  - Cola de hasta 2 giros pendientes. Cada paso consume un giro como máximo.
  - Un giro se descarta si es igual u opuesto (180°) a la última dirección de la cola, o a la dirección actual si la cola está vacía.
  - Con la cola llena, las flechas siguientes se ignoran hasta el próximo paso.
  - La cola se vacía al pausar, reanudar y reiniciar.
  - Sin ratón ni WASD.

- **HUD React:** Jugador, Puntuación y Nivel (sin Vidas ni Líneas). **Modal de fin:** PUNTUACIÓN FINAL y NIVEL.
- **Catálogo:** la fila `serpentina` pasa a `snake` con título `SNAKE` y un `long` nuevo, mediante una migración. Se mantienen `short`, `cat = ARCADE`, `cover = cover-snake`, `color = green`, `difficulty = 2` y `sort_order = 3`.
- **Registro:** `snake` en `PLAYABLE_GAME_IDS`, `ENGINES` y `GAME_META` (`scoreStep: 10`, `initialLives: null`, `hud: ["level"]`).
- **Portada `.cover-snake` rediseñada** con `/frontend-design` (añadido tras el paso 6: la portada heredada de `references/templates/styles.css` salía vacía porque su `background-image` llevaba posición y tamaño, y el navegador la descartaba):
  - Es un fotograma del juego un instante antes del bocado: serpiente en S de 11 segmentos (`--green`, cabeza `--ink`) avanzando hacia una manzana pixel-art a una celda de distancia.
  - La manzana es el primer recorte de `/games/snake/fruits.png` (`x = 34`, 110×160), sin suavizado y con un glow rojo suave.
  - Rejilla tenue de `--green` con alpha 0,08, alineada con los segmentos, como el tablero del juego.
  - Se mantiene el fondo `linear-gradient(135deg, #003a2a, #0a0a18)`.
  - Celda de `8cqmin` (`container-type: size` en `.cover-snake`), así que escala igual en la tarjeta de `/games`, la landing y `/games/snake`.
  - Solo CSS en `app/globals.css`; los componentes no cambian.
- `.hud-stat.level` y `.final-level` ya existen.

**Fuera de alcance (para futuras specs):**

- Sonido.
- Controles táctiles y jugabilidad en móvil.
- Mejoras sobre el Snake clásico: paredes que se atraviesan, obstáculos, frutas con valores distintos, frutas que caducan, power-ups, vidas.
- Sprites para la serpiente (cabeza, cuerpo, cola).
- Las filas emoji y realista de `fruits.png`.
- Modal o título de victoria propio al llenar el tablero.
- Selector de velocidad o de nivel inicial.
- WASD o teclas configurables.
- Antitrampas real.

---

## Modelo de datos

### Migración — `supabase/migrations/20261008170000_rename_serpentina_to_snake.sql`

```sql
-- The FK has no on update cascade, so drop it, move both sides, then restore it.
alter table public.scores drop constraint scores_game_id_fkey;

update public.games
   set id = 'snake',
       title = 'SNAKE',
       long = 'Una serpiente de luz recorre la grilla devorando frutas pixeladas. Cada bocado la alarga y cada cinco la hace más veloz. Un choque contra el muro o contra su propia cola y se acabó.'
 where id = 'serpentina';
update public.scores set game_id = 'snake' where game_id = 'serpentina';

-- Sin on delete cascade: borrar un juego con puntuaciones debe fallar.
alter table public.scores
  add constraint scores_game_id_fkey
  foreign key (game_id) references public.games (id);
```

No cambia el esquema: no hace falta `npm run db:types`.

### Metadatos (`lib/engines/meta.ts`, entrada nueva)

```ts
snake: {
  scoreStep: 10,
  initialLives: null,
  hud: ["level"],
  controls: [
    { keys: ["←", "↑", "→", "↓"], label: "Mover" },
    { keys: ["P", "ESC"], label: "Pausa" },
  ],
},
```

Las etiquetas de `controls` no se repiten porque `EnginePlayer` las usa como `key`.

### Archivos del motor

- `lib/engines/snake/sprites.ts`: `FRUIT_SPRITE_SRC = "/games/snake/fruits.png"` y `FRUITS: { x: number; y: number; w: number; h: number }[]` con los 22 recortes de `sprites.js` (misma `x` y `w`, `y = 0`, `h = 160`). Solo datos, tipado.
- `lib/engines/snake/entities.ts`: constantes (`W`, `H`, `COLS`, `ROWS`, `CELL`, `START_SPEED = 8`, `MAX_SPEED = 20`, `FRUITS_PER_LEVEL = 5`, `FRUIT_POINTS = 10`, `MAX_QUEUED_TURNS = 2`), tipos (`Cell = { x: number; y: number }`, `Dir = "up" | "down" | "left" | "right"`) y helpers puros (`stepCell`, `isOpposite`, `speedForLevel`, `randomFreeCell`, `drawGrid`, `drawSnake`, `drawFruit`), que reciben lo que necesitan. Sin globals.
- `lib/engines/snake/engine.ts`: `createSnakeGame: GameFactory`. Contiene el estado (`snake`, `dir`, `turnQueue`, `fruit`, `fruitSprite`, `fruitsEaten`, `score`, `level`, `stepAccumulator`), la carga de la imagen, el input, el bucle rAF, las colisiones y el render.

### Puntuación

| Acción      | Puntos |
| ----------- | ------ |
| Comer fruta | 10     |

`scoreStep = 10`. El tablero admite 765 frutas (768 celdas − 3 segmentos iniciales), así que el máximo real es 7.650 (muy por debajo de 10.000.000).

---

## Plan de implementación

1. **Migración del catálogo.** Crear y aplicar `20261008170000_rename_serpentina_to_snake.sql` con `npx supabase db push`. Verificar con MCP `execute_sql` que `games` tiene `snake` / `SNAKE` con el `long` nuevo y `sort_order = 3`, y que no queda `serpentina`. Hasta el paso 4, `/games/snake` funciona como juego mock.
2. **Asset y atlas.** Recortar la fila pixel-art de `references/source-assets/snake-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png` (3790×160). Crear `lib/engines/snake/sprites.ts`. Verificar: `/games/snake/fruits.png` se sirve y muestra las 22 frutas pixel-art en una fila.
3. **Entidades.** Leer `.claude/skills/add-game/porting-guide.md`. Crear `lib/engines/snake/entities.ts` con las constantes y helpers. Verificar: `npm run build` pasa.
4. **Motor.** Crear `lib/engines/snake/engine.ts` con `createSnakeGame`:
   - Fases, pausa por `blur` / `visibilitychange`, `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar y reiniciar.
   - Carga de la imagen con flag `destroyed`. Espacio no empieza hasta que la imagen carga o falla.
   - Teclado por `e.code` en `window`. `preventDefault` en flechas y Espacio solo en `ready`, `playing` y `paused`. Cola de giros vaciada al pausar, reanudar y reiniciar.
   - `onStats` con `score` y `level` solo cuando cambian.
   - `destroy()` cancela el rAF y quita todos los listeners.
5. **Registro.** Añadir `snake` a `PLAYABLE_GAME_IDS`, `ENGINES` (`createSnakeGame`) y `GAME_META`. Verificar: `/games/snake/play` monta el motor con el overlay de inicio y los controles de Snake.
6. **Portada.** Ejecutar `/frontend-design` y reescribir `.cover-snake` / `::before` / `::after` en `app/globals.css`. Verificar con capturas en `/games`, la landing y `/games/snake`.
7. **Cierre.** Partida como invitado y otra con sesión. Comprobación con MCP. Recorrer los criterios de aceptación. `npm run lint` y `npm run build`.

---

## Criterios de aceptación

Generales de integración:

- [x] `npm run build` termina sin errores ni warnings de tipos.
- [x] `npm run lint` termina sin errores.
- [x] La consola no muestra errores ni avisos de hidratación en `/games`, `/games/snake`, `/games/snake/play` y `/hall-of-fame`.
- [x] `/games` muestra la tarjeta de SNAKE con el texto nuevo y `/hall-of-fame` su pestaña.
- [x] `/games/serpentina` devuelve la página 404.
- [x] `/games/snake/play` muestra el canvas en la CRT con el overlay de inicio y los 2 controles de Snake. El juego no avanza hasta pulsar Espacio.
- [x] El canvas se ve nítido con `devicePixelRatio` 2 y sin deformar: las celdas son cuadradas y la fruta pixel-art no se ve borrosa.
- [x] El canvas no dibuja puntuación, nivel, pausa ni game over.
- [x] Flechas y Espacio no hacen scroll durante la partida.
- [ ] P, Esc y el botón PAUSA pausan y reanudan. Cambiar de pestaña o salir de la ventana pausa la partida y no se reanuda sola.
- [x] El HUD React muestra Jugador, Puntuación y Nivel, sin Vidas ni Líneas, y se actualiza durante la partida.
- [x] Chocar abre el modal con PUNTUACIÓN FINAL y NIVEL, sin LÍNEAS.
- [x] Con sesión, el modal pasa a `▸ PUNTUACIÓN GUARDADA_` y `select * from scores order by id desc limit 1` devuelve `game_id = 'snake'` con esa puntuación.
- [x] Una partida produce una sola fila en `scores` (también con Strict Mode).
- [x] Sin sesión, el modal invita a iniciar sesión y no se inserta nada.
- [x] Tras guardar, `/games/snake` muestra la marca en el leaderboard y en las estadísticas.
- [x] `saveScore({ gameId: "snake", score: 15 })` devuelve `invalid`.
- [x] JUGAR DE NUEVO empieza una partida nueva directamente con puntuación 0, nivel 01 y la serpiente de 3 segmentos en el centro mirando a la derecha.
- [x] SALIR y VOLVER AL VAULT desmontan el juego: las flechas vuelven a hacer scroll y no queda ningún `requestAnimationFrame`.
- [x] Emulando un dispositivo táctil, se muestra "REQUIERE TECLADO" y no arranca el motor.
- [x] `get_advisors` (security y performance) no muestra avisos nuevos.
- [ ] Asteroids, Tetris y Arkanoid siguen igual (controles, HUD y guardado).

Jugabilidad:

- [x] Comer una fruta suma exactamente 10 y alarga la serpiente un segmento.
- [x] Al comer la quinta fruta el HUD pasa a NIVEL 02 y la serpiente pasa de 8 a 9 pasos/s.
- [ ] En el nivel 13 y siguientes la velocidad se queda en 20 pasos/s.
- [ ] La fruta nunca aparece sobre la serpiente.
- [ ] En una misma partida aparecen frutas distintas de la fila pixel-art.
- [x] Chocar con cualquiera de los 4 bordes termina la partida.
- [x] Chocar con el propio cuerpo termina la partida.
- [x] Moverse a la celda que la cola abandona en ese paso no termina la partida.
- [x] Pulsar la flecha opuesta a la dirección actual no hace nada.
- [x] Yendo a la derecha, pulsar ↑ y ← muy rápido (antes del siguiente paso) hace un giro en U sin chocar.
- [x] Bloqueando la carga de `/games/snake/fruits.png`, la fruta se dibuja como un núcleo magenta y el juego se puede jugar.

Portada:

- [x] La portada de SNAKE muestra la serpiente verde con la cabeza clara y una manzana pixel-art nítida delante, en `/games`, en la landing y en `/games/snake`.
- [x] La serpiente y la manzana quedan centradas y proporcionadas en los tres tamaños de portada, sin recortarse.
- [x] La manzana no muestra trozos de las frutas vecinas del sprite.
- [x] Las demás portadas no cambian.

---

## Decisiones

- **Sí:** motor TypeScript sin React con el contrato `GameFactory` de SPEC 05. React solo monta el canvas y escucha callbacks.
- **Sí:** reutilizar `scores`, `saveScore`, `get_leaderboard` y las estadísticas existentes. Se activan con `isPlayable`.
- **No:** tabla, acción o función de ranking propias del juego.
- **Sí:** renombrar la fila `serpentina` a `snake` / `SNAKE`, con el mismo patrón que `rocas → asteroids`, `caida → tetris` y `bloque-buster → arkanoid`.
- **Sí:** reescribir el `long`. El actual habla de "núcleos magenta" y la comida ahora son frutas.
- **No:** fila nueva (dejaría una SERPENTINA mock duplicada) ni mantener el id `serpentina` (la URL no coincidiría con el título).
- **Sí:** diseño desde cero con reglas de Snake clásico. No hay `game.js` de referencia, solo sprites.
- **Sí:** serpiente neón vectorial y frutas pixel-art de la hoja de referencia. El pixel-art encaja con la CRT y la serpiente mantiene la estética de los otros motores.
- **No:** filas emoji o realista de la hoja. Desentonan con la CRT.
- **Sí:** recortar solo la fila pixel-art. Baja el peso del asset y el atlas queda más simple (`y = 0`).
- **Sí:** núcleo `--magenta` como respaldo si la imagen no carga. El juego no depende del asset para funcionar.
- **Sí:** tablero 32×24 de celdas de 25 px. Llena exactamente el espacio lógico 800×600 sin bandas.
- **Sí:** paredes que matan y sin vidas. Es el Snake clásico. Por eso `initialLives: null` y el HUD solo muestra Nivel.
- **No:** paredes que se atraviesan ni 3 vidas. Son variantes del clásico.
- **Sí:** +10 por fruta, nivel cada 5 frutas y +1 paso/s por nivel hasta 20. La dificultad crece de forma visible y `scoreStep = 10` como Asteroids y Arkanoid.
- **No:** puntos que dependen del nivel o del tipo de fruta. Más reglas sin aportar al primer Snake.
- **Sí:** fruta aleatoria entre las 22 del atlas, todas con el mismo valor. Da variedad visual sin cambiar las reglas.
- **Sí:** cola de 2 giros. Sin ella, dos flechas rápidas entre pasos pierden la primera y un giro en U acaba en choque.
- **Sí:** llenar el tablero termina en `over` con el modal genérico. No hace falta cambiar el contrato.
- **No:** modal de victoria propio. Requeriría ampliar `GamePhase` o `onPhase` en todos los motores.
- **No:** sonido. Mismo criterio que SPEC 05; el audio irá en su propia spec para todos los juegos.
- **No:** ratón. El Snake no lo necesita.
- **Sí:** rediseñar `.cover-snake` con una fruta pixel-art. La portada heredada salía vacía (declaración CSS inválida) y su punto magenta ya no representaba la comida del juego.
- **No:** solo corregir la declaración inválida. Habría dejado la portada con el núcleo magenta, que el juego ya no usa.
- **Sí:** la portada es un fotograma del juego (misma rejilla, colores y celdas). No añade efectos propios; la plataforma ya tiene la CRT.
- **Sí:** tamaño en `cqmin`. Una misma regla sirve para la tarjeta, la landing y el detalle.

---

## Riesgos

| Riesgo                                                                 | Mitigación                                                                                                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Strict Mode monta dos veces el motor                                   | `destroy()` cancela el rAF y quita listeners; flag `destroyed` en `onload` / `onerror`; el guardado va ligado al id de partida.            |
| La imagen carga después de crear el motor o no carga                   | Espacio no empieza hasta `onload` u `onerror`. Con error se dibuja el núcleo `--magenta`.                                                  |
| El sprite viene de spriters-resource (Google Snake) sin licencia clara | Se mantiene el comentario con el origen en `sprites.ts`. Si hace falta retirarlo, el respaldo `--magenta` permite jugar sin el asset.      |
| Un frame lento a 20 pasos/s se salta pasos                             | `dt` limitado a 50 ms; el acumulador avanza como mucho un paso por frame a esa velocidad (50 ms = 1 paso), sin atravesar celdas.           |
| El escalado de la CRT difumina el pixel-art                            | `imageSmoothingEnabled = false` en el contexto y buffer × `devicePixelRatio`.                                                              |
| El renombrado de `serpentina` falla por la FK                          | Mismo patrón probado en `rocas → asteroids`, `caida → tetris` y `bloque-buster → arkanoid`: quitar la FK, mover ambos lados y restaurarla. |

---

## Lo que **no** entra en esta spec

- Sonido.
- Controles táctiles.
- Mejoras sobre el Snake clásico (paredes que se atraviesan, obstáculos, frutas con valores distintos o que caducan, power-ups, vidas).
- Sprites para la serpiente.
- Filas emoji y realista de la hoja de frutas.
- Modal de victoria.
- Selector de velocidad o de nivel inicial.
- WASD o teclas configurables.
- Antitrampas real.

Cada uno de estos puntos, si llega, va en su propia spec.

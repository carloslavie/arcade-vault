# SPEC 19 — RANARIA jugable (marea sin fin)

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06, SPEC 10, SPEC 13, SPEC 18
> **Fecha:** 2026-10-19
> **Objetivo:** Crear un Frogger nuevo como motor TypeScript jugable en `/games/ranaria/play`, con 3 skins y mando táctil, y con sus puntuaciones guardadas en `scores` y visibles en el leaderboard, la biblioteca y el Salón de la Fama.

---

## Por qué existe esta spec

Hoy el catálogo tiene la fila mock `ranaria` (RANARIA, ARCADE, `cover-rana`, `green`, dificultad 3, `sort_order = 7`), que describe un Frogger pero no tiene motor y no aparece en la biblioteca (SPEC 08).
No hay `game.js` ni assets de referencia en `references/`, así que esta spec fija todas las reglas: generación del mundo, carriles, velocidades, puntuación, niveles y condición de fin.
Es la variante 03 de la game jam (`specs/game-jam/ranaria/`), elegida frente a la clásica y a la de lengua.
El cruce no acaba en una pantalla: la rana sube por un mundo generado sin fin de carreteras, ríos y franjas de hierba.
La puntuación mide la distancia recorrida, no hay vidas (muerte súbita, como Snake) y cada 25 filas hay una orilla de nenúfares que hace de meta de control y sube el nivel.
El temporizador por vida, que no cabe en `HudStat`, se convierte en una marea de neón que sube desde abajo. Se dibuja en el canvas como parte del mundo y no hace falta tocar la plataforma.
La variante se escribió antes de SPEC 13 y SPEC 18, así que esta spec la adapta: el juego nace con sus 3 skins (`clasico`, `neon`, `retro`) y con mando táctil.
La plataforma ya es genérica (`GAME_META`, `scoreStep` por juego, HUD según `hud`, skins y mando táctil por juego).
Esta spec solo crea el motor, actualiza los textos de la fila y lo activa con `isPlayable`; el resto (`saveScore`, leaderboard, estadísticas, Salón de la Fama, selector de skin, mando) se activa sin código nuevo.

---

## Alcance

**Dentro:**

- **Motor de Ranaria en TypeScript**, sin React, en `lib/engines/ranaria/`:
  - Canvas lógico `W = 800`, `H = 600`, ya 4:3: ocupa toda la CRT sin bandas. Buffer × `devicePixelRatio`.
  - Rejilla de `CELL = 40` px. El campo tiene `COLS = 19` columnas, de `x = 20` a `x = 780`. Los 20 px de cada lado son seto decorativo.
  - **Mundo vertical:** las filas se numeran hacia arriba desde 0. La pantalla muestra `VISIBLE_ROWS = 15` filas.
  - **Cámara:** `camBottom` es la altura (en filas) del borde inferior de la pantalla. Su objetivo es `max(0, filaMax − 4)` y se acerca a él a 6 filas/s. Nunca baja.
    - La fila `r` se dibuja en `y = H − (r − camBottom + 1)·40`.
  - **Generación (`generator.ts`):** función pura que recibe la fila, el nivel y un `rng: () => number` (en el motor, `Math.random`).
    - Filas 0–3: hierba.
    - Cada fila múltiplo de 25 (25, 50, 75…) es una **orilla de nenúfares**: seto con 5 nenúfares en las columnas 1, 5, 9, 13 y 17. La fila anterior y la siguiente son siempre hierba.
    - El resto se genera por tramos: tras una franja de hierba viene un tramo de carretera (55 %) o de río (45 %) de `1` a `min(5, 2 + nivel)` carriles, y después 1 fila de hierba (50 %) o 2 (50 %).
    - Un tramo se recorta si llegaría a la fila anterior a una orilla.
    - Los carriles de un tramo alternan de sentido; el sentido del primero es al azar.
    - **Carril de carretera:** coche (70 %, 1 celda, 60–110 px/s) o camión (30 %, 2 celdas, 40–70 px/s), con hueco de 3 a 6 celdas.
    - **Carril de río:** tronco (60 %, 3–5 celdas, 40–80 px/s) o tortugas (40 %, grupos de 2–3, 50–80 px/s), con hueco de 2 a 3 celdas.
    - Desde el nivel 3, en los carriles de tortugas bucea uno de cada 3 grupos, con ciclo de 4 s: 2,5 s a flote, 0,5 s hundiéndose (sostienen) y 1 s sumergidas (no sostienen).
    - Cada carril es un patrón cíclico de `count = ceil((19 + len) / (len + gap))` objetos, con desfase inicial al azar. Así un objeto nunca aparece de golpe dentro del campo.
    - La velocidad del carril se multiplica al generarlo por `mul(nivel) = min(2, 1 + 0.1·(nivel − 1))` y ya no cambia.
    - El color de cada coche se guarda como índice de tono (`tint: 0 | 1 | 2`), elegido al azar al generar el carril. La skin activa traduce el índice a `car1`, `car2` o `car3`, así que cambiar de skin recolorea los carriles ya generados.
    - Se generan filas hasta `camBottom + 17` y se descartan las que quedan por debajo de `camBottom − 2`.
  - **Rana:** empieza en la fila 2, columna 9 (centro `x = 400`), mirando arriba.
    - Cada pulsación de flecha es un salto de una celda que dura `HOP_MS = 120` ms. Se dibuja interpolado y mirando en la dirección del salto.
    - `e.repeat` se ignora: mantener una flecha pulsada salta una sola vez.
    - Se guarda como máximo 1 salto pendiente pulsado durante otro salto.
    - La posición `x` es continua. Al aterrizar en hierba o carretera, `x` se ajusta al centro de columna más cercano.
    - Un salto lateral se ignora si el centro de destino queda fuera de `[40, 760]`. Un salto hacia abajo desde la fila 0 se ignora.
    - Caja de colisión de 28×28 centrada en la rana.
  - **Río:** al aterrizar en un carril de río, la rana necesita que su centro quede sobre un tronco o unas tortugas a flote. Si no, se ahoga.
    - Sobre una plataforma, la rana se desplaza con ella (`velocidad × dt`). Durante un salto no se desplaza.
    - Si las tortugas bajo la rana se sumergen, se ahoga.
    - Si la plataforma la saca del campo (centro fuera de `[20, 780]`), muere.
  - **Carretera:** si la caja de la rana toca la caja de un vehículo (recortada 4 px por cada lado en horizontal), muere. Se comprueba cada frame con la posición interpolada.
  - **Orilla de nenúfares:** al saltar a una orilla, la rana se posa en un nenúfar si su centro está a menos de `HOME_TOLERANCE = 20` px de su centro (`x = 80, 240, 400, 560, 720`). En el seto, muere.
    - Como se llega desde hierba, la rana está alineada a columna: hay que ir a las columnas 1, 5, 9, 13 o 17.
    - Posarse suma el bonus de orilla, sube el nivel y hace bajar la marea a su distancia máxima (`tide = filaMax − 3,75`).
    - Los nenúfares no se ocupan: el camino sigue hacia arriba.
    - El bonus, la subida de nivel y la bajada de la marea solo ocurren la primera vez que se alcanza cada orilla. Volver a posarse en ella tras bajar es seguro, pero no suma; el seto sigue matando.
  - **Marea (el temporizador):** una línea `tide` (altura en filas, decimal) que sube sin parar.
    - Empieza en `−1` (fuera de pantalla).
    - Sube a `TIDE_BASE = 0.35` filas/s × `mul(nivel)`, con tope de 0,7 filas/s desde el nivel 11.
    - Nunca queda más de `TIDE_CUSHION = 3.75` filas por debajo de la fila máxima: `tide = max(tide, filaMax − 3.75)`. Correr no da más ventaja que ese colchón.
    - Como el colchón (3,75) es menor que el adelanto de la cámara (4), la cresta siempre asoma al menos 10 px por el borde inferior.
    - Si la marea cubre el centro de la rana (`tide ≥ filaRana + 0.5`, con la fila interpolada durante el salto), la rana muere.
    - Quieta en la salida, la marea alcanza a la rana en 10 s.
  - **Sin vidas:** cualquier muerte (vehículo, agua, salir del campo, seto, marea) termina la partida tras una animación de 700 ms (anillo que se expande: color `hit` de la skin en carretera y seto, color `splash` en el agua y la marea). La entrada se ignora mientras dura.
  - **Niveles:** `nivel = 1 + orillas superadas`. El nivel acelera la marea al instante y los carriles que se generan a partir de ese momento.
  - `dt` del rAF limitado a 50 ms.
- **Formas (iguales en las 3 skins, sin assets):**
  - Hierba: banda rellena con `grass`. Carretera: fondo con líneas discontinuas de carril en `laneLine`. Río: banda rellena con `river`.
  - Orilla: seto relleno con `hedge` y nenúfares con contorno circular `lily`. Al posarse, el nenúfar se rellena de `lily` durante 400 ms.
  - Rana: cuerpo `frog`, ojos `eye`, patas en trazo `frog`. Al saltar se escala a 1,15 a mitad del salto.
  - Troncos: contorno `log` con relleno `log` a `logFillAlpha`. Tortugas: círculos `turtle`. Hundiéndose, alpha 0,5. Sumergidas, solo el contorno con alpha 0,15.
  - Coches en `car1`, `car2` o `car3` según su `tint`. Camiones en `truck`.
  - **Marea:** banda desde la línea `tide` hasta el borde inferior, con relleno `tide` a `tideAlpha`. La cresta es una onda de 4 px de amplitud y 80 px de longitud que se desplaza, en trazo `tide` de 3 px, y un segundo trazo `crestAlt` con alpha 0,5 desfasado media onda.
  - Los objetos se recortan (`clip`) al campo `x = 20–780`.
  - Glow con `shadowBlur = glow` de la skin por grupo (carriles, rana, marea).
  - El canvas no dibuja HUD: puntuación y nivel salen por `onStats`. No hay barra ni número de tiempo: la marea es el tiempo.
  - El canvas no dibuja pausa ni game over.
- **Skins** (SPEC 13) en `lib/engines/ranaria/skins.ts`: `RANARIA_SKINS: Record<SkinId, RanariaSkin>`, con las paletas de la sección Paletas.
  - El motor resuelve la skin con `resolveColors` en `applySkin(id)`, como Snake (SPEC 16), y guarda paleta y campos de render en variables de la instancia.
  - `setSkin(id)` vuelve a llamar a `applySkin`. Si la fase es `ready` o `paused`, redibuja.
  - `engine.ts`, `entities.ts` y `generator.ts` no contienen colores literales.
  - Las skins son solo cosméticas: no cambian reglas, tamaños, velocidades ni puntuación.
- **Fases** `ready → playing ⇄ paused → over`, igual que SPEC 05: Espacio empieza, y P/Esc o la pérdida de foco pausan; la partida nunca se reanuda sola.
  - En `ready` se ven las primeras 15 filas quietas, la rana en la salida y la marea fuera de pantalla.
  - La animación de muerte cuenta como `playing`.
  - Morir o pulsar FIN pasan a `over`.
- **Controles:**

  | Entrada               | Acción                    |
  | --------------------- | ------------------------- |
  | `←` / `↑` / `→` / `↓` | Saltar                    |
  | `P` / `Esc`           | Pausa                     |
  | `Espacio`             | Empezar (solo en `ready`) |
  - Teclas por `e.code` (`ArrowLeft`, `ArrowUp`, `ArrowRight`, `ArrowDown`, `KeyP`, `Escape`, `Space`).
  - El salto pendiente se descarta al pausar, reanudar y reiniciar.
  - Sin ratón ni WASD.

- **Mando táctil** (SPEC 18): `GAME_META.ranaria.touch` con una cruceta `dpad` de 4 flechas a la izquierda y `right: null`, como Snake.
  - Sin `repeat`: cada toque es un salto, y mantener el botón pulsado salta una sola vez (los `keydown` sintéticos llegan con `repeat: false` y sin autorepeat).
  - En táctil, **TOCA PARA EMPEZAR** arranca la partida con `tapKey("Space")`, y la pausa va por el botón PAUSA del HUD. No hace falta código nuevo en `EnginePlayer`.
- **HUD React:** Jugador, Puntuación y Nivel (sin Vidas ni Líneas), como Snake. **Modal de fin:** PUNTUACIÓN FINAL y NIVEL.
- **Catálogo:** se reutiliza la fila `ranaria` y se actualizan `short`, `long` y `difficulty = 4`, mediante una migración. Se mantienen `title = RANARIA`, `cat = ARCADE`, `cover = cover-rana`, `color = green` y `sort_order = 7`.
- **Registro:** `ranaria` en `PLAYABLE_GAME_IDS`, `ENGINES` y `GAME_META` (`scoreStep: 10`, `initialLives: null`, `hasSkins: true`, `hud: ["level"]`, `touch`).
- Sin CSS nuevo: `.cover-rana`, `.hud-stat.level`, `.final-level`, el selector de skin y el mando táctil ya existen.
- La variante de la game jam se mueve a esta spec: `specs/game-jam/ranaria/03-ranaria-marea-sin-fin.md` deja de existir. Las variantes 01 y 02 se quedan en `specs/game-jam/ranaria/`.

**Fuera de alcance (para futuras specs):**

- Sonido.
- Gestos (swipe para saltar).
- Mejoras sobre esta variante: semilla diaria compartida, monedas o moscas, power-ups, biomas nuevos (vías de tren, hielo), cocodrilos, vidas o checkpoints con respawn.
- Mostrar la distancia en filas en el HUD o en el leaderboard (la puntuación ya la refleja).
- Ampliar `HudStat` con una celda de tiempo.
- Sprites o assets de imagen.
- Rediseño de la portada `.cover-rana`.
- Skins más allá de las 3 de la plataforma.
- WASD o teclas configurables.
- Antitrampas real.

---

## Modelo de datos

### Migración — `supabase/migrations/20261019120000_update_ranaria.sql`

```sql
-- Same id and title: texts and difficulty change for the endless variant.
update public.games
   set short = 'Salta sin fin antes de que suba la marea.',
       long = 'Carreteras y ríos se suceden sin final mientras una marea de neón sube a tus espaldas. Salta entre coches, súbete a troncos y tortugas, y cruza cada orilla de nenúfares para ganar ventaja. Un solo error y se acabó.',
       difficulty = 4
 where id = 'ranaria';
```

No cambia el esquema: no hace falta `npm run db:types`.

### Metadatos (`lib/engines/meta.ts`, entrada nueva)

```ts
ranaria: {
  scoreStep: 10,
  initialLives: null,
  hasSkins: true,
  hud: ["level"],
  controls: [
    { keys: ["←", "↑", "→", "↓"], label: "Saltar" },
    { keys: ["P", "ESC"], label: "Pausa" },
  ],
  touch: {
    left: {
      kind: "dpad",
      buttons: [
        { code: "ArrowUp", label: "▲", aria: "Saltar arriba" },
        { code: "ArrowLeft", label: "◀", aria: "Saltar a la izquierda" },
        { code: "ArrowRight", label: "▶", aria: "Saltar a la derecha" },
        { code: "ArrowDown", label: "▼", aria: "Saltar abajo" },
      ],
    },
    right: null,
  },
},
```

Las etiquetas de `controls` no se repiten porque `EnginePlayer` las usa como `key`.

### Archivos del motor

- `lib/engines/ranaria/generator.ts`: tipos `RowKind = "grass" | "road" | "river" | "shore"`, `Row = { index: number; kind: RowKind; lane?: Lane }` y `Lane = { kind: "car" | "truck" | "log" | "turtle"; len: number; gap: number; count: number; dir: 1 | -1; speed: number; offset: number; divers: number[]; tint: 0 | 1 | 2 }`, y la función pura `createRowGenerator(rng)` que devuelve `next(level): Row` con las reglas de tramos, orillas y recortes. Sin estado global.
- `lib/engines/ranaria/entities.ts`: tipo `Palette` (las 18 claves de la tabla de colores), constantes (`W`, `H`, `CELL = 40`, `COLS = 19`, `FIELD_X = 20`, `VISIBLE_ROWS = 15`, `START_ROW = 2`, `START_COL = 9`, `SHORE_EVERY = 25`, `HOME_COLS = [1, 5, 9, 13, 17]`, `HOME_TOLERANCE = 20`, `HOP_MS = 120`, `CAM_SPEED = 6`, `CAM_LEAD = 4`, `TIDE_START = -1`, `TIDE_BASE = 0.35`, `TIDE_CUSHION = 3.75`, `DEATH_MS = 700`, `DIVE_CYCLE = [2.5, 0.5, 1]`, `SPEED_STEP = 0.1`, `MAX_SPEED_MUL = 2`, puntos), tipos (`Dir`, `Frog`) y helpers puros (`speedMul`, `rowToY`, `laneObjects`, `isSupported`, `hitsVehicle`, `homeAt`, `drawRow`, `drawFrog`, `drawTide`, `drawDeath`), que reciben la paleta y los campos de render. Sin globals.
- `lib/engines/ranaria/skins.ts`: `RanariaSkin = SkinDef<keyof Palette> & { grassAlpha: number; hedgeAlpha: number; laneLineAlpha: number; logFillAlpha: number; tideAlpha: number }` y `RANARIA_SKINS: Record<SkinId, RanariaSkin>`.
- `lib/engines/ranaria/engine.ts`: `createRanariaGame: GameFactory`. Contiene el estado (`rows`, `generator`, `frog`, `pendingHop`, `maxRow`, `camBottom`, `tide`, `score`, `level`, `deathTimer`, `diveClock`, `waveClock`), la skin activa, el input, el bucle rAF, la generación y descarte de filas, las colisiones y el render.

### Puntuación

| Acción                                   | Puntos |
| ---------------------------------------- | ------ |
| Saltar a una fila más alta que la máxima | 10     |
| Posarse en un nenúfar de una orilla      | 100    |

`scoreStep = 10`. Cada 25 filas valen 250 + 100 = 350 puntos, así que harían falta unas 714.000 filas para llegar al máximo.
El motor limita la puntuación a 10.000.000.

---

## Paletas

### Colores

| Clave        | Qué pinta                                       | `clasico` | `neon`                  | `retro`   |
| ------------ | ----------------------------------------------- | --------- | ----------------------- | --------- |
| `background` | Fondo del canvas y asfalto de la carretera      | `#000000` | `#000000`               | `#0b0700` |
| `grass`      | Franjas de hierba (con `grassAlpha`)            | `#5a1e8c` | `--green` / `#00ff88`   | `#3a2400` |
| `laneLine`   | Líneas discontinuas de carril (`laneLineAlpha`) | `#ffffff` | `--ink` / `#e6e9ff`     | `#7a4f00` |
| `river`      | Relleno del río                                 | `#000066` | `#001a2e`               | `#1c1100` |
| `hedge`      | Seto de las orillas y laterales (`hedgeAlpha`)  | `#063806` | `--green` / `#00ff88`   | `#5c3a00` |
| `lily`       | Contorno y destello de los nenúfares            | `#2ecc40` | `--green` / `#00ff88`   | `#ffb000` |
| `frog`       | Cuerpo y patas de la rana, y su glow            | `#66ff33` | `--green` / `#00ff88`   | `#ffe2a6` |
| `eye`        | Ojos de la rana                                 | `#ffffff` | `--ink` / `#e6e9ff`     | `#0b0700` |
| `log`        | Contorno y relleno de los troncos               | `#b5651d` | `#ff9f1c`               | `#9a6400` |
| `turtle`     | Tortugas                                        | `#e8262b` | `#ff3b3b`               | `#c88a00` |
| `car1`       | Coches con `tint = 0`                           | `#ffe14d` | `--cyan` / `#00f5ff`    | `#ffb000` |
| `car2`       | Coches con `tint = 1`                           | `#ff4fd8` | `--yellow` / `#f5ff00`  | `#ffb000` |
| `car3`       | Coches con `tint = 2`                           | `#4dd2ff` | `--magenta` / `#ff006e` | `#ffb000` |
| `truck`      | Camiones                                        | `#f0f0f0` | `#ff9f1c`               | `#ffcc55` |
| `tide`       | Relleno (`tideAlpha`) y cresta de la marea      | `#3d8bff` | `--cyan` / `#00f5ff`    | `#ffb000` |
| `crestAlt`   | Segundo trazo de la cresta (alpha 0,5)          | `#ffffff` | `--magenta` / `#ff006e` | `#ffe2a6` |
| `hit`        | Anillo de muerte en carretera y seto            | `#ff3b30` | `--magenta` / `#ff006e` | `#ffe2a6` |
| `splash`     | Anillo de muerte en el agua y la marea          | `#3d8bff` | `--cyan` / `#00f5ff`    | `#ffb000` |

### Render

| Ajuste                | `clasico` | `neon` | `retro` |
| --------------------- | --------- | ------ | ------- |
| `glow` (`shadowBlur`) | `0`       | `10`   | `4`     |
| `grassAlpha`          | `1`       | `0.10` | `1`     |
| `hedgeAlpha`          | `1`       | `0.25` | `1`     |
| `laneLineAlpha`       | `0`       | `0.15` | `0.6`   |
| `logFillAlpha`        | `1`       | `0.25` | `1`     |
| `tideAlpha`           | `0.35`    | `0.25` | `0.3`   |

Tamaños, grosores de trazo, amplitud de la onda y animaciones son iguales en las 3 skins. Sin scanlines en el canvas: `.crt-screen::after` ya las pone.

### Contraste

Calculado con luminancia relativa WCAG, sobre el color efectivo (con su alpha) del fondo que pisa cada elemento.

| Elemento contra su fondo       | `clasico` | `neon` | `retro` |
| ------------------------------ | --------- | ------ | ------- |
| Rana sobre hierba              | 8,0:1     | 13,6:1 | 11,6:1  |
| Rana sobre carretera           | 15,9:1    | 15,7:1 | 16,0:1  |
| Rana sobre tronco              | 3,3:1     | 8,3:1  | 4,0:1   |
| Rana sobre la marea            | 9,9:1     | 9,0:1  | 8,4:1   |
| Tronco sobre río               | 4,1:1     | 8,6:1  | 3,7:1   |
| Tortugas sobre río             | 4,0:1     | 5,0:1  | 6,3:1   |
| Coche más oscuro sobre asfalto | 7,4:1     | 5,5:1  | 11,0:1  |
| Camión sobre asfalto           | 18,4:1    | 10,2:1 | 13,4:1  |
| Nenúfar sobre seto             | 6,2:1     | 8,9:1  | 5,6:1   |

Todos los elementos jugables superan 3:1 contra su fondo.
Rana sobre tortugas (2,4–2,6:1) y sobre nenúfar (1,0–1,6:1) quedan por debajo: la rana se pinta encima con ojos en `eye` y silueta propia, y se distingue por forma.
Seto y hierba se parecen en las 3 skins a propósito: la orilla se lee por los 5 círculos de nenúfar, que sí contrastan con el seto.

### Notas por skin

- **`clasico` (recreativa original de cruzar la carretera):** asfalto negro, aceras moradas, río azul oscuro, rana verde lima, troncos marrones, tortugas rojas y coches de colores vivos, sin glow ni líneas de carril.
  - Las franjas de hierba son la acera morada del original: la rana espera en ellas como en la recreativa.
  - Coches amarillo, rosa y azul claro, y camiones blancos: los tres tonos de coche no comparten color con la rana, los troncos ni las tortugas.
- **`neon` (estética de la plataforma):** son los colores de la variante de la game jam, con hierba y seto translúcidos sobre negro y glow 10.
  - Rana y nenúfares comparten `--green`: el nenúfar es un contorno fino y la rana un cuerpo relleno con ojos.
- **`retro` (monitor de fósforo ámbar):** 7 tonos de ámbar, del casi negro `#0b0700` al crema `#ffe2a6`, con glow suave de 4.
  - Se elige ámbar y no LCD verde para no repetir el `retro` de Snake y porque la rana verde sobre fondo verde se perdería.
  - Los 3 tonos de coche son el mismo ámbar: el sentido y el carril ya los distinguen, y en `retro` se permite diferenciar por forma.
  - La rana es el tono más claro de la pantalla para que siempre se encuentre.

---

## Plan de implementación

1. **Migración del catálogo.** Crear y aplicar `20261019120000_update_ranaria.sql` con `npx supabase db push`. Verificar con MCP `execute_sql` que `ranaria` tiene el `short` y el `long` nuevos y `difficulty = 4`, y conserva `title`, `cat`, `cover` y `sort_order = 7`.
2. **Generador.** Leer `.claude/skills/add-game/porting-guide.md`. Crear `lib/engines/ranaria/generator.ts`. Verificar con un script puntual que no se commitea (1.000 filas con `Math.random`): las filas 0–3 son hierba, las múltiplo de 25 son orilla con hierba antes y después, ningún tramo pasa de 5 carriles y todos los huecos de río están entre 2 y 3 celdas.
3. **Entidades y skins.** Crear `lib/engines/ranaria/entities.ts` con `Palette`, constantes y helpers, y `lib/engines/ranaria/skins.ts` con `RANARIA_SKINS`. Verificar: `npm run build` pasa.
4. **Motor.** Crear `lib/engines/ranaria/engine.ts` con `createRanariaGame`:
   - Fases, pausa por `blur` / `visibilitychange`, `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar y reiniciar.
   - Teclado por `e.code` en `window`, ignorando `e.repeat`. `preventDefault` en flechas y Espacio solo en `ready`, `playing` y `paused`. Salto pendiente descartado al pausar, reanudar y reiniciar.
   - Generación y descarte de filas, cámara, salto, arrastre en el río, buceo, colisiones, orillas, marea y muerte.
   - `applySkin(options.skin)` al crear y `setSkin(id)` con redibujo en `ready` y `paused`.
   - `onStats` con `score` y `level` solo cuando cambian.
   - `destroy()` cancela el rAF y quita todos los listeners.
5. **Registro.** Añadir `ranaria` a `PLAYABLE_GAME_IDS`, `ENGINES` (`createRanariaGame`) y `GAME_META` (con `hasSkins: true` y `touch`). Verificar: `/games/ranaria/play` monta el motor con el overlay de inicio, los controles de Ranaria y el selector de skin, en lugar del `GamePlayer` mock.
6. **Táctil.** Emular un móvil con Playwright (`hasTouch: true`, `isMobile: true`, 390×844 y 844×390) y comprobar el mando, TOCA PARA EMPEZAR y que un toque es un salto.
7. **Cierre.** Partida como invitado y otra con sesión. Comprobación con MCP. Actualizar en `CLAUDE.md` la lista de juegos jugables y `references/implemented-games.md`. Recorrer los criterios de aceptación. `npm run lint` y `npm run build`.

---

## Criterios de aceptación

Generales de integración:

- [ ] `npm run build` termina sin errores ni warnings de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] La consola no muestra errores ni avisos de hidratación en `/games`, `/games/ranaria`, `/games/ranaria/play` y `/hall-of-fame`.
- [ ] `/games` muestra la tarjeta de RANARIA con el `short` nuevo y la portada `cover-rana`, y `/hall-of-fame` su pestaña.
- [ ] `/games/ranaria` muestra el `long` nuevo y dificultad 4.
- [ ] `/games/ranaria/play` muestra el canvas en la CRT con el overlay de inicio y los 2 controles de Ranaria. El juego no avanza hasta pulsar Espacio.
- [ ] El canvas se ve nítido con `devicePixelRatio` 2 y sin deformar: las celdas son cuadradas y los nenúfares son círculos.
- [ ] El canvas no dibuja puntuación, nivel, tiempo, pausa ni game over.
- [ ] Flechas y Espacio no hacen scroll durante la partida.
- [ ] P, Esc y el botón PAUSA pausan y reanudan. Cambiar de pestaña o salir de la ventana pausa la partida y no se reanuda sola.
- [ ] Durante la pausa la marea no sube.
- [ ] El HUD React muestra Jugador, Puntuación y Nivel, sin Vidas ni Líneas, y se actualiza durante la partida.
- [ ] Morir abre el modal con PUNTUACIÓN FINAL y NIVEL, sin LÍNEAS.
- [ ] Con sesión, el modal pasa a `▸ PUNTUACIÓN GUARDADA_` y `select * from scores order by id desc limit 1` devuelve `game_id = 'ranaria'` con esa puntuación.
- [ ] Una partida produce una sola fila en `scores` (también con Strict Mode).
- [ ] Sin sesión, el modal invita a iniciar sesión y no se inserta nada.
- [ ] Tras guardar, `/games/ranaria` muestra la marca en el leaderboard y en las estadísticas.
- [ ] `saveScore({ gameId: "ranaria", score: 15 })` devuelve `invalid`.
- [ ] JUGAR DE NUEVO empieza una partida nueva directamente con puntuación 0, nivel 01, la rana en la fila 2 y un mundo generado de nuevo.
- [ ] SALIR y VOLVER AL VAULT desmontan el juego: las flechas vuelven a hacer scroll y no queda ningún `requestAnimationFrame`.
- [ ] `get_advisors` (security y performance) no muestra avisos nuevos.
- [ ] `specs/game-jam/ranaria/03-ranaria-marea-sin-fin.md` ya no existe y las variantes 01 y 02 siguen en su carpeta.
- [ ] Asteroids, Tetris, Arkanoid y Snake siguen igual (controles, HUD, skins, mando táctil y guardado).

Skins:

- [ ] `RANARIA_SKINS` está tipado `Record<SkinId, RanariaSkin>` y cada skin define las 18 claves de `Palette`, `glow` y los 5 alphas de render.
- [ ] `engine.ts`, `entities.ts` y `generator.ts` no contienen ningún color literal (hex ni `rgba`) fuera de `skins.ts`.
- [ ] `clasico` es la skin por defecto: con `localStorage` vacío, `/games/ranaria/play` muestra asfalto negro, hierba morada, río azul oscuro, rana verde lima y sin glow.
- [ ] Con `neon`, hierba y seto son verdes translúcidos, el río es `#001a2e` y hay glow.
- [ ] Con `retro`, todo el canvas usa solo los tonos ámbar de la tabla (más los intermedios que dejan los alphas).
- [ ] El selector muestra `CLÁSICO`, `NEÓN` y `RETRO`, y el botón activo tiene `aria-pressed="true"`.
- [ ] Cambiar de skin durante `playing` no reinicia la partida: puntuación, nivel, posición de la rana, mundo, cámara y marea se mantienen, y los coches ya generados cambian de color.
- [ ] Cambiar de skin en `ready` o `paused` redibuja el canvas al momento sin cambiar de fase.
- [ ] Recargar `/games/ranaria/play` conserva la última skin elegida (`av:skin:v1:ranaria`).
- [ ] La puntuación y la jugabilidad no cambian entre skins.

Táctil (emulando `hasTouch: true` e `isMobile: true`):

- [ ] No aparece **REQUIERE TECLADO**: el overlay de `ready` muestra **TOCA PARA EMPEZAR** y tocarlo empieza la partida.
- [ ] Se ve una cruceta con ▲ ◀ ▶ ▼ y ningún otro botón.
- [ ] Un toque en ▲ hace un salto hacia arriba; mantenerlo pulsado no hace más saltos.
- [ ] ◀, ▶ y ▼ saltan en su dirección.
- [ ] En 390×844 el mando está debajo de la CRT, y en 844×390 a su lado, sin scroll horizontal. _(Pendiente: el mando y la CRT caben, pero la página mide 396 px en vertical y 1146 px en horizontal por el desborde de la nav `.av-nav`, que ya existía antes de esta spec y afecta a todas las rutas. Se resuelve en `specs/mobile/nav-movil.md`.)_
- [ ] PAUSA y REANUDAR del HUD pausan y reanudan la partida.

Jugabilidad:

- [ ] Cada ↑ hasta una fila nueva suma exactamente 10. Bajar y volver a subir a una fila ya alcanzada no suma.
- [ ] Mantener ↑ pulsado hace un solo salto.
- [ ] Pulsar ↓ en la fila 0 no mueve la rana.
- [ ] Quieta en la salida, la marea alcanza a la rana a los 10 s (±0,5 s) y la partida termina.
- [ ] Subiendo sin parar, la cresta de la marea sigue asomando por el borde inferior de la pantalla.
- [ ] Bajar 5 filas desde la fila máxima mete a la rana en la marea y termina la partida.
- [ ] La cámara sube al avanzar y nunca baja, ni al saltar hacia abajo.
- [ ] Un vehículo, el agua, salir del campo o el seto terminan la partida al primer error (no hay vidas).
- [ ] Sobre un tronco, la rana se mueve con él.
- [ ] La fila 25 es una orilla con 5 nenúfares, con hierba justo antes y justo después.
- [ ] Posarse en un nenúfar de la fila 25 suma 110 en total (10 de la fila y 100 de la orilla), el HUD pasa a NIVEL 02 y la marea baja de golpe al borde inferior.
- [ ] Saltar al seto de una orilla termina la partida.
- [ ] En el nivel 2 la marea sube a 0,385 filas/s. Desde el nivel 11 se queda en 0,7 filas/s.
- [ ] Antes del nivel 3 ninguna tortuga bucea. Desde el nivel 3 bucea uno de cada 3 grupos.
- [ ] Ningún tramo tiene más de `2 + nivel` carriles ni más de 5.
- [ ] En ningún carril de río hay un hueco de más de 3 celdas entre plataformas.
- [ ] Tras subir 500 filas, el motor guarda como mucho 20 filas en memoria.

---

## Decisiones

- **Sí:** motor TypeScript sin React con el contrato `GameFactory` de SPEC 05. React solo monta el canvas y escucha callbacks.
- **Sí:** reutilizar `scores`, `saveScore`, `get_leaderboard` y las estadísticas existentes. Se activan con `isPlayable`.
- **No:** tabla, acción o función de ranking propias del juego.
- **Sí:** reutilizar la fila `ranaria` y actualizar `short`, `long` y `difficulty`. El id ya es el `game-id`, pero los textos actuales describen una pantalla fija con tiempo y esta variante es infinita y con marea.
- **No:** fila nueva (dejaría una RANARIA mock duplicada) ni renombrado (no hay id distinto al que mover).
- **Sí:** nombre de migración `update_ranaria`. No es `add` ni `rename`: el id no cambia, como permite `integration-checklist.md`.
- **Sí:** `difficulty = 4`. Sin vidas y con presión constante es más exigente que el Frogger clásico (3) y está al nivel de Asteroids.
- **Sí:** id `ranaria` y título `RANARIA`. Ya está en el catálogo y no usa la marca Frogger.
- **Sí:** variante 03 de la game jam (marea sin fin). Es la más distinta del catálogo: otra progresión (distancia), otra condición de fin (muerte súbita) y otro reto (leer carriles nuevos en cada partida).
- **Sí:** mover la variante a esta spec y borrar el archivo de la game jam, como indica `CLAUDE.md`. Las otras dos variantes se quedan como histórico.
- **Sí:** las 3 skins en esta misma spec. El juego nace cumpliendo el mínimo de SPEC 13 y no necesita una spec de skins aparte como SPEC 14–17.
- **Sí:** color de coche como índice `tint` y no como color. Así cambiar de skin recolorea los carriles ya generados sin regenerar el mundo.
- **Sí:** `retro` en ámbar. El LCD verde ya lo usa Snake y una rana verde sobre fondo verde se perdería.
- **Sí:** `clasico` con aceras moradas, río azul y troncos marrones. Es el look reconocible de la recreativa original, sin marcas ni logos.
- **Sí:** mando táctil con cruceta de 4 flechas y sin autorepeat, como Snake. Cada toque es un salto, igual que cada pulsación de tecla.
- **No:** gestos de swipe. SPEC 18 los dejó fuera para todos los juegos.
- **Sí:** orillas de nenúfares cada 25 filas. Mantienen las casillas de meta del tema como puntos de control que suben el nivel y dan respiro.
- **Sí:** el temporizador se convierte en una marea dibujada en el canvas. Es parte del mundo (como las rocas de Asteroids), no una estadística del HUD, y su distancia a la rana ya dice cuánto tiempo queda.
- **No:** ampliar `HudStat` con una celda de tiempo. La marea no tiene un número de segundos fijo: depende de lo lejos que esté la rana.
- **No:** barra de tiempo en el canvas. Duplicaría la marea con dos relojes distintos.
- **Sí:** colchón de 3,75 filas, menor que el adelanto de cámara de 4. Sin colchón, correr acumularía ventaja infinita y la marea dejaría de presionar; con este valor, su cresta siempre se ve.
- **Sí:** la orilla baja la marea al colchón máximo. Premia llegar a la meta sin dar tiempo acumulable.
- **Sí:** el bonus de orilla solo cuenta la primera vez que se alcanza (decidido al implementar). Sin esto, bajar y volver a posarse en la misma orilla sumaría 100 y subiría el nivel sin avanzar.
- **Sí:** sin vidas, HUD con Nivel. Mismo criterio que Snake: un error termina la partida, y la puntuación compara distancias.
- **No:** 3 vidas con respawn. Obligaría a decidir dónde reaparecer en un mundo que se descarta por abajo y a retroceder la marea.
- **Sí:** +10 por fila nueva y +100 por orilla, `scoreStep = 10`. La puntuación se lee como distancia y las orillas pesan.
- **No:** bonus por tiempo. Sin temporizador numérico no hay segundos que contar.
- **Sí:** velocidad fijada al generar cada carril. Los carriles ya visibles no cambian de golpe al subir de nivel; solo la marea se acelera al instante.
- **Sí:** tope de ×2 en el nivel 11. Por encima, los coches pasarían de 220 px/s y la marea de 0,7 filas/s, y no daría tiempo a leer el siguiente tramo.
- **Sí:** huecos de río de 2–3 celdas, plataformas de al menos 2 celdas y huecos de carretera de al menos 3. Garantiza que todo carril se puede cruzar esperando.
- **Sí:** hierba antes de cada orilla. La rana llega alineada a columna y entrar en un nenúfar depende de elegir columna, no de la deriva de un tronco.
- **Sí:** `rng` inyectado en el generador. El generador es puro y se puede verificar con un script; el motor usa `Math.random`.
- **No:** semilla diaria compartida. Haría falta guardarla o calcularla en el servidor y mostrarla; va en otra spec.
- **Sí:** descartar filas por debajo de la cámara. La memoria no crece con la distancia.
- **Sí:** ignorar `e.repeat` y 1 salto pendiente. Igual que el Frogger clásico: se juega a golpes de tecla.
- **No:** sonido. Mismo criterio que SPEC 05; el audio irá en su propia spec para todos los juegos.
- **No:** ratón. El salto por celdas no lo necesita.
- **Sí:** mantener `.cover-rana`. Ya existe y sus franjas cian y la rana verde representan también esta variante.

---

## Riesgos

| Riesgo                                                           | Mitigación                                                                                                                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta dos veces el motor                             | `destroy()` cancela el rAF y quita listeners; el mundo, el generador y el resto del estado viven en el closure; el guardado va ligado al id de partida. |
| El generador crea un tramo imposible de cruzar                   | Huecos acotados por tipo de carril, carriles alternos de sentido, tope de 5 carriles por tramo y script de verificación en el paso 2.                   |
| La marea mata injustamente al empezar                            | Arranca fuera de pantalla y tarda 10 s en llegar a la salida; la rana tiene 4 filas de hierba para leer el primer tramo.                                |
| La cámara y la marea se desincronizan y la marea queda invisible | El colchón (3,75) es menor que el adelanto de cámara (4), así que la cresta siempre queda dentro del borde inferior; hay criterio.                      |
| Las coordenadas crecen sin límite en partidas largas             | Las filas son enteros y el dibujo usa `r − camBottom`; a 714.000 filas sigue lejos de la precisión de `number`.                                         |
| La generación provoca tirones                                    | Se genera una fila por salto como mucho y cada fila es un objeto pequeño; no hay generación por lotes.                                                  |
| Un vehículo rápido atraviesa la rana en un frame lento           | `dt` limitado a 50 ms: a ×2 el coche más rápido (220 px/s) avanza 11 px por frame, menos que la caja de 28 px de la rana.                               |
| La autorrepetición del teclado sube filas sola                   | `e.repeat` se ignora y solo hay 1 salto pendiente, que se descarta al pausar, reanudar y reiniciar.                                                     |
| En táctil, la marea no espera mientras el jugador busca el botón | Es el mismo reto que con teclado; la cruceta de 56 px está siempre en el mismo sitio y PAUSA está en el HUD.                                            |
| Rana poco visible sobre tortugas o nenúfares en alguna skin      | La rana se pinta encima con ojos en `eye` y silueta propia; los contrastes jugables principales están en la tabla y superan 3:1.                        |

---

## Lo que **no** entra en esta spec

- Sonido.
- Gestos de swipe.
- Semilla diaria, monedas, moscas, power-ups, biomas nuevos, cocodrilos, vidas o respawn.
- Distancia en filas en el HUD o en el leaderboard.
- Celda de tiempo en el HUD.
- Sprites o assets de imagen.
- Rediseño de la portada.
- Skins más allá de las 3 de la plataforma.
- WASD o teclas configurables.
- Antitrampas real.

Cada uno de estos puntos, si llega, va en su propia spec.

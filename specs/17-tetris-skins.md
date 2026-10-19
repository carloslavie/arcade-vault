# SPEC 17 — Skins de TETRIS

> **Estado:** Implementado
> **Depende de:** SPEC 13 (`specs/13-plataforma-skins.md`), SPEC 10 (`specs/10-tetris-jugable.md`)
> **Fecha:** 2026-10-19
> **Objetivo:** Dar a Tetris sus 3 skins de canvas (`clasico` por defecto, `neon` y `retro`) con paletas completas en `lib/engines/tetris/skins.ts`, seleccionables en caliente desde el player, con el mismo patrón que SPEC 14, 15 y 16.

---

## Por qué existe esta spec

SPEC 13 ya construyó la infraestructura (`SkinId`, `SkinDef`, `SkinColor`, `resolveColors`, `setSkin` en el contrato, `hasSkins` en `GameMeta`, `SkinPicker` y la preferencia en `localStorage`). Asteroids (SPEC 14), Arkanoid (SPEC 15) y Snake (SPEC 16) ya la usan.
El motor de Tetris (`lib/engines/tetris/`) sigue igual que antes de SPEC 13:

- `readTheme()` en `engine.ts` lee una única paleta neón de `:root` al crear el motor: I `--cyan`, O `--yellow`, T `--magenta`, S `--green`, y Z `#ff3b3b`, J `#3d7bff`, L `#ff8a00` y N (tuerca) `#9aa7b8` fijos. `Palette` es un `string[]` indexado por tipo de pieza (1–8).
- Un único color `frame` (`--cyan`) pinta tres cosas con opacidades fijas en `drawFrame()`: la rejilla (`globalAlpha = 0.08`, 0,5 px), el borde del tablero y la caja de la siguiente pieza (`0.35`, 1 px) y la etiqueta `SIGUIENTE` (opacidad 1, `10px` en `--pixel`).
- Hay colores y ajustes fijos fuera de la paleta: el fondo `"#000"` en `draw()`, el brillo superior de cada bloque `"rgba(255,255,255,0.12)"` de 4 px en `drawBlock()` (`entities.ts`), el glow `GLOW = 8` (bloques del tablero, pieza actual y siguiente pieza) y la opacidad de la pieza fantasma `0.2` (pintada sin glow).
- La factory ignora el tercer parámetro (`options`), `setSkin()` es un no-op y `GAME_META.tetris.hasSkins` es `false`, así que el player no muestra selector.

Eso equivale a un `neon` parcial y no registrado, y el jugador ve neón aunque `DEFAULT_SKIN` sea `clasico`, lo que incumple el requisito de la plataforma.
Esta spec completa la paleta, define las 3 skins y activa el selector para Tetris.

---

## Alcance

**Dentro:**

- **Paleta completa** en `lib/engines/tetris/entities.ts`. `Palette` deja de ser un `string[]` y pasa a tener 5 claves de color más los 8 colores de pieza:
  - `background`: fondo del canvas.
  - `grid`: líneas de la rejilla del tablero.
  - `frame`: borde del tablero y caja de la siguiente pieza.
  - `label`: texto `SIGUIENTE`.
  - `highlight`: franja de brillo superior de cada bloque (hoy el `rgba` fijo).
  - `pieces: Record<PieceName, string>`, con `PieceName = "I" | "O" | "T" | "S" | "Z" | "J" | "L" | "N"`.
- **Nombre por tipo:** `PIECE_NAMES` en `entities.ts` traduce el número de celda (1–8) al `PieceName`. El tablero sigue guardando números, así que los bloques ya colocados cambian de color con la skin sin tocar `Board`.
- **Marca por pieza** (`BlockMark = "none" | "core"`): con `core`, `drawBlock()` pinta después del bloque un cuadrado central de 10×10 px con el color `background` (un "hueco"), sin glow. Solo lo usa `retro` para separar las piezas que comparten tono. Se pinta también en la pieza fantasma (con su opacidad) y en la siguiente pieza.
- **Dibujo** en `entities.ts`, sin colores literales: `drawBlock()` recibe el color, el estilo del bloque (`highlight`, `highlightHeight`, `mark`, `background`) y la opacidad. Si `highlightHeight = 0` no pinta el brillo. Tamaño del bloque (28 px visibles en celdas de 30) y separación de 1 px por lado se mantienen.
- **Skins** en `lib/engines/tetris/skins.ts`: `TETRIS_SKINS: Record<SkinId, TetrisSkin>`, donde `TetrisSkin = SkinDef<"background" | "grid" | "frame" | "label" | "highlight"> & { pieces: Record<PieceName, SkinColor>; marks: Record<PieceName, BlockMark>; gridAlpha: number; frameAlpha: number; ghostAlpha: number; highlightHeight: number }`. Las piezas se resuelven con una segunda llamada a `resolveColors`, como `blocks` en Arkanoid.
- **Motor** (`lib/engines/tetris/engine.ts`):
  - Se eliminan `Theme`, `readTheme()` y `GLOW`. La fuente `--pixel` de la etiqueta no es parte de la skin: se lee una vez al crear el motor con un helper propio (`readPixelFont()`, fallback `monospace`).
  - La factory acepta `options` y resuelve `TETRIS_SKINS[options.skin]` en `applySkin(id)`, que guarda paleta, marcas, `glow`, `gridAlpha`, `frameAlpha`, `ghostAlpha` y `highlightHeight` en variables de la instancia (mismo patrón que `lib/engines/arkanoid/engine.ts`).
  - `draw()` pinta el fondo con `palette.background`; `drawFrame()` usa `grid` con `gridAlpha`, `frame` con `frameAlpha` y `label` con opacidad 1; la pieza fantasma usa `ghostAlpha`, y bloques, pieza actual y siguiente pieza usan el `glow` de la skin.
  - `setSkin(id)` llama a `applySkin(id)` y, si la fase es `ready` o `paused`, a `draw()`.
- **Registro:** `GAME_META.tetris.hasSkins = true`.
- Actualizar los comentarios de cabecera de `entities.ts` ("Only the colors changed: they come from the platform's neon palette") y `engine.ts`: los colores vienen de la skin activa.

**Fuera de alcance (para futuras specs):**

- Texturas o sprites de bloque distintos de la marca `core` (biseles completos, patrones por pieza de varios tonos).
- Fondo con marco decorativo, ladrillos laterales o ilustración en el canvas.
- Scanlines dibujadas en el canvas.
- Animación de limpieza de línea o efectos nuevos.
- Cambiar tamaño de celda, posición del tablero o de la caja `SIGUIENTE`, grosores de línea o fuente.
- Cambiar la portada `cover-tetro`.
- Cualquier cambio de reglas, velocidades, piezas o puntuación.

---

## Paletas

### Colores

`neon` usa `{ cssVar, fallback }` donde la tabla indica variable; el resto son hex fijos. Contraste calculado contra el `background` de la propia skin (WCAG, luminancia relativa).

| Clave        | Qué pinta                                                     | `clasico`               | `neon`                         | `retro`                               |
| ------------ | ------------------------------------------------------------- | ----------------------- | ------------------------------ | ------------------------------------- |
| `background` | Fondo del canvas y hueco de la marca `core`                   | `#000000`               | `#000000` (fijo, como hoy)     | `#0a0f1f`                             |
| `grid`       | Rejilla del tablero (0,5 px, con `gridAlpha`)                 | `#ffffff`               | `--cyan` / `#00f5ff`           | `#5577d0`                             |
| `frame`      | Borde del tablero y caja `SIGUIENTE` (1 px, con `frameAlpha`) | `#808080`               | `--cyan` / `#00f5ff`           | `#7a9ef0`                             |
| `label`      | Texto `SIGUIENTE` (10 px, `--pixel`)                          | `#ffffff`               | `--cyan` / `#00f5ff`           | `#a8c4ff`                             |
| `highlight`  | Brillo superior de cada bloque (si `highlightHeight > 0`)     | `rgba(255,255,255,0.3)` | `rgba(255,255,255,0.12)` (hoy) | `rgba(232,240,255,0.2)` (no se pinta) |
| `pieces.I`   | Barra de 4                                                    | `#00f0f0`               | `--cyan` / `#00f5ff`           | `#e8f0ff`                             |
| `pieces.O`   | Cuadrado 2×2                                                  | `#f0f000`               | `--yellow` / `#f5ff00`         | `#a8c4ff`                             |
| `pieces.T`   | T                                                             | `#a020f0`               | `--magenta` / `#ff006e`        | `#7a9ef0`                             |
| `pieces.S`   | S                                                             | `#00f000`               | `--green` / `#00ff88`          | `#5577d0`                             |
| `pieces.Z`   | Z                                                             | `#f00000`               | `#ff3b3b`                      | `#e8f0ff` + `core`                    |
| `pieces.J`   | J                                                             | `#3a6bff`               | `#3d7bff`                      | `#a8c4ff` + `core`                    |
| `pieces.L`   | L                                                             | `#f0a000`               | `#ff8a00`                      | `#7a9ef0` + `core`                    |
| `pieces.N`   | Tuerca (anillo 3×3)                                           | `#a0a0a0`               | `#9aa7b8`                      | `#5577d0` + `core`                    |

La pieza fantasma usa el color (y la marca) de la pieza actual con `ghostAlpha`, en las 3 skins, como hoy.

### Contraste contra el fondo

| Elemento                      | `clasico`              | `neon`                         | `retro`             |
| ----------------------------- | ---------------------- | ------------------------------ | ------------------- |
| `pieces.I`                    | 14,7:1                 | 15,5:1                         | 16,7:1              |
| `pieces.O`                    | 17,2:1                 | 19,2:1                         | 10,9:1              |
| `pieces.T`                    | 4,0:1                  | 5,5:1                          | 7,2:1               |
| `pieces.S`                    | 13,5:1                 | 15,7:1                         | 4,5:1               |
| `pieces.Z`                    | 4,7:1                  | 5,9:1                          | 16,7:1              |
| `pieces.J`                    | 4,7:1                  | 5,5:1                          | 10,9:1              |
| `pieces.L`                    | 9,7:1                  | 8,9:1                          | 7,2:1               |
| `pieces.N`                    | 8,0:1                  | 8,6:1                          | 4,5:1               |
| `frame` (decorativo)          | 5,3:1                  | ≈ 2,5:1 (alpha 0,35, como hoy) | ≈ 3,3:1 (alpha 0,6) |
| `label`                       | 21:1                   | 15,5:1                         | 10,9:1              |
| `grid` (decorativo, no juega) | muy tenue (alpha 0,06) | muy tenue (alpha 0,08)         | tenue (alpha 0,15)  |

Todas las piezas superan el objetivo de 3:1 en las 3 skins. La rejilla y el borde son decoración: la rejilla queda a propósito por debajo para no competir con los bloques, y el borde de `neon` se mantiene como hoy. El hueco `core` de `retro` es el propio fondo, así que contrasta con su pieza igual que la pieza con el fondo (de 4,5:1 a 16,7:1).

### Piezas distinguibles en `retro`

`retro` es un monitor monocromo de fósforo blanco azulado con 5 tonos: fondo `#0a0f1f` y, de más a menos brillante, `#e8f0ff`, `#a8c4ff`, `#7a9ef0` y `#5577d0`. Cada tono separa al siguiente con una relación de luminancia de 1,5 a 1,6.
Las 8 piezas se reparten en 4 tonos × 2 marcas, de modo que ningún par de piezas comparte tono y marca a la vez:

| Tono      | Sin marca (`none`) | Con hueco (`core`) |
| --------- | ------------------ | ------------------ |
| `#e8f0ff` | I                  | Z                  |
| `#a8c4ff` | O                  | J                  |
| `#7a9ef0` | T                  | L                  |
| `#5577d0` | S                  | N (tuerca)         |

Las parejas espejo (S/Z y J/L), que son las que más se confunden por forma, nunca comparten tono: S `#5577d0` liso frente a Z `#e8f0ff` con hueco; J `#a8c4ff` frente a L `#7a9ef0`, ambas con hueco pero en tonos distintos.

### Render

| Ajuste                           | `clasico`     | `neon`               | `retro`               |
| -------------------------------- | ------------- | -------------------- | --------------------- |
| `glow` (`shadowBlur` de bloques) | `0`           | `8` (actual `GLOW`)  | `3`                   |
| `shadowColor`                    | sin efecto    | color de cada bloque | color de cada bloque  |
| `gridAlpha`                      | `0.06`        | `0.08` (actual)      | `0.15`                |
| `frameAlpha`                     | `1`           | `0.35` (actual)      | `0.6`                 |
| `ghostAlpha` (sin glow)          | `0.2`         | `0.2` (actual)       | `0.3`                 |
| `highlightHeight` (px)           | `4`           | `4` (actual)         | `0` (sin brillo)      |
| Marcas `core`                    | ninguna       | ninguna              | Z, J, L y N           |
| Grosor rejilla / borde           | 0,5 px / 1 px | 0,5 px / 1 px        | 0,5 px / 1 px         |
| Scanlines en el canvas           | no            | no                   | no                    |
| Fondo                            | negro puro    | negro puro           | azul noche muy oscuro |

Tamaños y posiciones son los actuales en las 3 skins: tablero de 10×20 celdas de 30 px centrado en x = 250, bloques de 28×28, caja `SIGUIENTE` de 4×4 celdas en x = 590, y = 70, y etiqueta 14 px por encima.

### Notas por skin

- **`clasico` (colores estándar del género sobre negro):** el look reconocible de Tetris: I cian, O amarilla, T morada, S verde, Z roja, J azul y L naranja, en tonos sólidos sin glow.
  - La tuerca N, que solo existe en esta versión, va en gris `#a0a0a0`, el único bloque gris del canvas, como en `game.js` (`#9e9e9e`, "gris metálico").
  - J usa un azul aclarado `#3a6bff`: el azul puro `#0000f0` se queda en 2,3:1 sobre negro.
  - Brillo superior de 4 px más marcado (0,3) que en neón, que da el relieve de bloque de consola sin assets.
  - Pozo con borde gris sólido `#808080` y rejilla casi invisible (blanco a 0,06), equivalente a la `--grid-line` `#22222e` del original.
  - No se usan los tonos pastel de `game.js` (`#4dd0e1`, `#ba68c8`...): el rol de `clasico` pide los colores reconocibles del juego, y el pastel sobre `#1a1a25` era el tema del prototipo, no del arcade.
- **`neon` (estética de la plataforma):** exactamente el render actual, ahora registrado y con fondo explícito. Rejilla, borde y etiqueta siguen en `--cyan` con las mismas opacidades, aunque ahora son 3 claves separadas con el mismo valor.
- **`retro` (monitor monocromo de fósforo blanco azulado):** 5 tonos de un solo matiz frío, sin brillo superior y con un glow suave de 3, el halo del fósforo.
  - Se diferencia de los otros `retro` de la plataforma: Asteroids es fósforo verde, Arkanoid ámbar y Snake un LCD verde claro de 4 tonos.
  - Con fondo oscuro caben 4 tonos de pieza por encima de 4,5:1; con fondo claro tipo LCD solo los 2 más oscuros pasarían de 3:1.
  - Las piezas que comparten tono se distinguen por la marca `core` (hueco central del color del fondo), como las texturas por pieza de las portátiles monocromas.
  - Fantasma a 0,3 en vez de 0,2: el tono más oscuro (`#5577d0`) a 0,2 sobre azul noche casi no se ve.
  - Sin scanlines en el canvas: `.crt-screen::after` ya las pone sobre todas las skins.
  - La rejilla, el borde, el fantasma y el glow generan tonos intermedios del mismo matiz; no añaden matices nuevos.

### Assets

Tetris no usa sprites ni archivos en `public/games/tetris/`: todo se dibuja con rectángulos. Las 3 skins solo cambian colores, opacidades, brillo y la marca `core`. No hace falta ningún asset nuevo.

---

## Plan de implementación

Requiere SPEC 13 implementada (`SkinId`, `SkinDef`, `SkinColor`, `resolveColors`, `setSkin` en el contrato, `hasSkins` en `GameMeta` y `SkinPicker`). Seguir el patrón de `lib/engines/arkanoid/skins.ts` y `applySkin` en `lib/engines/arkanoid/engine.ts` (sub-registro resuelto con una segunda llamada a `resolveColors`).

1. **Paleta y dibujo.** En `lib/engines/tetris/entities.ts`, añadir `PieceName`, `PIECE_NAMES` (índice 0 vacío, 1–8 en el orden de `PIECES`), `BlockMark`, la nueva `Palette` y el estilo de bloque. Cambiar `drawBlock()` para recibir el estilo (sin el `rgba` fijo, sin brillo si `highlightHeight = 0`, hueco 10×10 centrado con `background` y `shadowBlur = 0` si la marca es `core`). Actualizar el comentario de cabecera. Verificar: `npm run build` pasa.
2. **Skins.** Crear `lib/engines/tetris/skins.ts` con `TetrisSkin` y `TETRIS_SKINS` con los valores de las tablas de esta spec. `neon` usa `{ cssVar, fallback }` para `grid`, `frame`, `label`, `pieces.I`, `pieces.O`, `pieces.T` y `pieces.S`. Verificar: `npm run build` pasa y quitar una pieza de `pieces` o de `marks` en cualquier skin lo hace fallar.
3. **Motor.** En `engine.ts`, quitar `Theme`, `readTheme` y `GLOW`, añadir `readPixelFont()`, el parámetro `options` y `applySkin(id)`, y usar `background`, `grid`/`gridAlpha`, `frame`/`frameAlpha`, `label`, `ghostAlpha`, `glow`, las marcas y `PIECE_NAMES` en `drawFrame()`, `drawNext()` y `draw()`. Verificar: con `av:skin:v1:tetris = "neon"` en `localStorage`, el canvas se ve igual que antes de esta spec.
4. **`setSkin`.** Sustituir el no-op por la versión real: llama a `applySkin(id)` y a `draw()` en `ready` y `paused`. Verificar: con el juego en pausa, cambiar a `retro` desde el selector cambia tablero, fantasma y siguiente pieza al momento.
5. **Activar.** Poner `GAME_META.tetris.hasSkins = true`. Verificar: `/games/tetris/play` muestra el selector `MODO · CLÁSICO · NEÓN · RETRO` en `.crt-bottom` y cambia la skin en caliente.
6. **Cierre en el navegador.** Recorrer los criterios de aceptación con Playwright MCP en `/games/tetris/play`: las 3 skins en `ready`, `playing` y `paused`, con bloques colocados de varias piezas, la pieza fantasma visible y la siguiente pieza en la caja, hasta ver aparecer las 8 piezas (incluida la tuerca) en cada skin; recarga con `localStorage`, JUGAR DE NUEVO y consola sin errores. Después, `npm run lint` y `npm run build`.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores ni warnings de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] `TETRIS_SKINS` está tipado `Record<SkinId, TetrisSkin>` y cada skin define las 5 claves de color, los 8 colores de `pieces`, las 8 entradas de `marks`, `glow`, `gridAlpha`, `frameAlpha`, `ghostAlpha` y `highlightHeight`.
- [ ] Quitar un `PieceName` de `pieces` o de `marks` en cualquier skin hace fallar `npm run build`.
- [ ] `engine.ts` y `entities.ts` no contienen ningún color literal (`"#000"`, hex ni `rgba`) fuera de `skins.ts`.
- [ ] `clasico` es la skin por defecto: con `localStorage` vacío, `/games/tetris/play` muestra fondo negro, borde gris sólido, etiqueta `SIGUIENTE` blanca, piezas I cian, O amarilla, T morada, S verde, Z roja, J azul, L naranja y tuerca gris, sin glow.
- [ ] Con `neon`, el canvas es idéntico al de antes de esta spec (mismos 8 colores, rejilla, borde y etiqueta en cian con alpha 0,08 / 0,35 / 1, brillo 0,12 de 4 px, fantasma a 0,2 y glow 8).
- [ ] Con `retro`, todo el canvas usa solo los 5 tonos de la tabla (más los tonos intermedios del mismo matiz que generan la rejilla a 0,15, el borde a 0,6, el fantasma a 0,3 y el glow de 3), con fondo `#0a0f1f`.
- [ ] Con `retro`, Z, J, L y la tuerca muestran el hueco central del color del fondo, e I, O, T y S no; ningún par de piezas comparte tono y marca.
- [ ] Con `retro`, el hueco también aparece en la siguiente pieza y en la pieza fantasma.
- [ ] En las 3 skins la pieza fantasma se ve debajo de la pieza actual y se distingue de los bloques colocados.
- [ ] El selector muestra `CLÁSICO`, `NEÓN` y `RETRO`, y el botón activo tiene `aria-pressed="true"`.
- [ ] Cambiar de skin durante `playing` no reinicia la partida: puntuación, líneas, nivel, tablero, pieza actual, posición, rotación y siguiente pieza se mantienen.
- [ ] Cambiar de skin durante `playing` recolorea también los bloques ya colocados.
- [ ] Cambiar de skin en `paused` redibuja el canvas al momento y la partida sigue en pausa.
- [ ] Cambiar de skin en `ready` redibuja el tablero vacío y la siguiente pieza, y la partida no empieza.
- [ ] Después de pulsar un botón del selector con el ratón, pulsar Espacio en `ready` empieza la partida y no cambia la skin, y en `playing` Espacio hace caída y las flechas mueven y rotan la pieza.
- [ ] Recargar `/games/tetris/play` conserva la última skin elegida (`av:skin:v1:tetris`).
- [ ] JUGAR DE NUEVO mantiene la skin elegida.
- [ ] La puntuación y la jugabilidad no cambian entre skins: 100 / 300 / 500 / 800 × nivel por líneas, +1 por bajada suave, +2 por celda de caída, nivel cada 10 líneas, intervalo de 1000 ms a 100 ms, 8 piezas con azar uniforme y tablero de 10×20 celdas de 30 px en las 3 skins.
- [ ] Una partida con cualquier skin se guarda en `scores` igual que hoy y `saveScore` sigue validando con `scoreStep = 1`.
- [ ] El HUD React, los overlays de la CRT y el modal de fin se ven igual en las 3 skins.
- [ ] La consola no muestra errores ni avisos de hidratación en `/games/tetris/play`.
- [ ] Asteroids, Arkanoid y Snake conservan sus 3 skins y su preferencia guardada.

---

## Decisiones

- **Sí:** `background`, `grid`, `frame`, `label` y `highlight` como claves de la paleta. Eran el `"#000"`, el `rgba` fijo y un único `frame` que pintaba tres cosas distintas; `clasico` necesita un borde sólido sin que la rejilla se vuelva igual de visible.
- **Sí:** `pieces` como sub-registro `Record<PieceName, SkinColor>` resuelto con una segunda llamada a `resolveColors`, como `blocks` en Arkanoid. Obliga a cada skin a definir las 8 piezas.
- **No:** mantener `Palette` como `string[]` indexado. Una skin con un color de menos compilaría y pintaría `undefined`.
- **Sí:** el tablero sigue guardando números de pieza y el color se resuelve al dibujar. Así los bloques colocados cambian de skin en caliente sin tocar la lógica.
- **Sí:** 8 piezas, no 7. El motor tiene también la tuerca `N` (SPEC 10), que cuenta como pieza jugable con su propio color en las 3 skins.
- **Sí:** `clasico` con los colores estándar del género (I cian, O amarilla, T morada, S verde, Z roja, J azul, L naranja). Es lo que el rol de `clasico` describe como "piezas de colores estándar en tetris".
- **No:** `clasico` con los tonos pastel de `game.js` y fondo `#1a1a25`. Era el tema visual del prototipo portado, no el look reconocible del juego, y varios tonos (T `#ba68c8`, J `#90caf9`) se acercan entre sí.
- **Sí:** J en `#3a6bff` y T en `#a020f0`. Los tonos puros del estándar (`#0000f0`, `#a000f0`) quedan por debajo o al límite de 3:1 sobre negro.
- **Sí:** tuerca gris en `clasico`, como el "gris metálico" del original. Es el único bloque gris (el borde `#808080` no es un bloque y va a 1 px).
- **Sí:** `neon` idéntico al render actual, incluido el fondo `#000000` en vez de `--bg`. Quien elija NEÓN ve exactamente lo de hoy.
- **Sí:** `retro` como monitor monocromo de fósforo blanco azulado de 5 tonos. Es el único matiz de fósforo que no usa otro juego (verde en Asteroids, ámbar en Arkanoid, LCD verde en Snake) y con fondo oscuro deja 4 tonos de pieza por encima de 4,5:1.
- **No:** `retro` de 4 tonos handheld con fondo claro. Repetiría el LCD de Snake y solo 2 tonos superarían 3:1, muy pocos para 8 piezas.
- **No:** `retro` en rojo monocromo. Los rojos oscuros no llegan a 3:1 sobre negro y solo cabrían 2 tonos de pieza legibles.
- **Sí:** marca `core` (hueco central) para las piezas que comparten tono en `retro`. 4 tonos × 2 marcas dan 8 combinaciones únicas sin salir de la paleta corta, y el hueco es el propio fondo, así que no añade tonos.
- **No:** 8 tonos distintos en `retro`. Pasaría del máximo de 6 y los saltos de brillo serían demasiado pequeños para leerse.
- **Sí:** las parejas espejo S/Z y J/L en tonos distintos en `retro`. Son las que más se confunden por forma.
- **Sí:** fantasma a 0,3 en `retro` y 0,2 en las otras. El tono más oscuro a 0,2 sobre azul noche casi desaparece; en negro, 0,2 ya funciona hoy.
- **Sí:** glow 0 en `clasico`, 8 en `neon` y 3 en `retro`. Las consolas originales no tenían glow, el neón actual usa 8 y el fósforo tiene un halo suave.
- **Sí:** sin brillo superior en `retro`. Añadiría un tono fuera de la paleta corta; la separación de 2 px entre bloques basta para leer cada celda.
- **Sí:** la fuente `--pixel` de la etiqueta queda fuera de la skin. Es tipografía de la plataforma, no un color, y es igual en las 3 skins.
- **No:** scanlines en el canvas. La CRT ya aplica `.crt-screen::after` a todas las skins.
- **No:** tamaños, separaciones o grosores distintos por skin. Un bloque que pareciera más grande o más pequeño confundiría dónde encaja la pieza.
- **Sí:** `clasico` por defecto. Cambia lo que ve hoy el jugador (neón con glow) a piezas de colores estándar sin glow; NEÓN sigue a un clic y se recuerda por juego.

---

## Riesgos

| Riesgo                                                                           | Mitigación                                                                                                                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los jugadores actuales esperan el look neón y ven piezas sin glow                | El selector está a la vista en la CRT y la elección se guarda. Criterio: `neon` es idéntico al render actual.                                     |
| En `retro`, los tonos contiguos (`#a8c4ff` / `#7a9ef0`) se confunden en la pila  | Cada salto de tono es de 1,5× en luminancia y la mitad de las piezas lleva hueco. Si cuesta leerlos, se separan los tonos sin bajar de 4,5:1.     |
| `retro` se percibe parecido a `neon` (azul frente a cian)                        | `retro` usa fondo azul noche, tonos desaturados, sin brillo superior y glow 3; `neon` es saturado sobre negro puro con glow 8.                    |
| El hueco `core` hereda el glow o el `globalAlpha` y se ve borroso                | `drawBlock()` pinta el hueco con `shadowBlur = 0` y la misma opacidad que el bloque, y restaura el `shadowBlur` al terminar, como el brillo hoy.  |
| `setSkin` en `ready` o `paused` no se ve porque el bucle solo pinta en `playing` | `setSkin` llama a `draw()` en esas fases. Criterios en `ready` y `paused`.                                                                        |
| Redibujar en `over` pintaría la pieza que acaba de chocar encima del tablero     | `setSkin` no redibuja en `over` (como el resto de motores): el último frame se queda bajo el modal y la nueva skin se ve en la siguiente partida. |
| La tuerca no aparece durante la verificación y su color queda sin comprobar      | El paso 6 exige ver las 8 piezas en cada skin; con azar uniforme entre 8 aparece en pocas piezas.                                                 |

---

## Lo que **no** entra en esta spec

- Texturas, biseles completos o sprites de bloque por skin.
- Fondo decorativo, marco ilustrado o scanlines en el canvas.
- Animaciones nuevas (limpieza de línea, caída).
- Tamaños, posiciones, grosores o fuente distintos por skin.
- Portada nueva.
- Cambios de reglas, piezas, velocidades o puntuación.

Cada uno de estos puntos, si llega, va en su propia spec.


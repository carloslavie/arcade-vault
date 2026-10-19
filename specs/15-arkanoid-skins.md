# SPEC 15 — Skins de ARKANOID

> **Estado:** Implementado
> **Depende de:** SPEC 13 (`specs/13-plataforma-skins.md`), SPEC 11 (`specs/11-arkanoid-jugable.md`)
> **Fecha:** 2026-10-19
> **Objetivo:** Dar a Arkanoid sus 3 skins de canvas (`clasico` por defecto, `neon` y `retro`) con paletas completas en `lib/engines/arkanoid/skins.ts`, seleccionables en caliente desde el player.

---

## Por qué existe esta spec

SPEC 13 ya construyó la infraestructura (`SkinId`, `SkinDef`, `resolveColors`, `setSkin` en el contrato, `hasSkins` en `GameMeta`, `SkinPicker` y la preferencia en `localStorage`). Asteroids ya la usa (SPEC 14).
El motor de Arkanoid (`lib/engines/arkanoid/`) sigue igual que antes de SPEC 13:

- `readPalette()` en `engine.ts` lee una única paleta neón de `:root` al crear el motor: paleta `--cyan`, pelota `--ink` y los 7 colores de bloque de `BLOCK_COLORS` en `entities.ts` (4 con variable de `:root` y `red` `#ff3b3b`, `hotpink` `#ff5ec8` y `gray` `#9aa7b8` fijos).
- Hay colores y ajustes fijos fuera de la paleta: el fondo `"#000"` en `draw()`, el brillo superior de cada bloque `"rgba(255,255,255,0.18)"` en `drawRect()` y el glow `GLOW = 10`.
- La factory ignora el tercer parámetro (`options`) y `setSkin()` es un no-op.
- `GAME_META.arkanoid.hasSkins` es `false`, así que el player no muestra selector.

Eso equivale a un `neon` parcial y no registrado, y el look por defecto (neón) no es `clasico`, lo que incumple el requisito de la plataforma.
Esta spec completa la paleta, define las 3 skins y activa el selector para Arkanoid.

---

## Alcance

**Dentro:**

- **Paleta completa** en `lib/engines/arkanoid/entities.ts`. `Palette` pasa a tener 6 claves de color más los 7 colores de bloque:
  - `background`: fondo del canvas.
  - `paddle`: cuerpo de la paleta.
  - `paddleTrim`: remates de los extremos de la paleta (nuevo, 10 px a cada lado).
  - `ball`: pelota.
  - `highlight`: franja de brillo superior de bloques y explosiones (hoy el `rgba` fijo).
  - `shade`: franja de sombra inferior de bloques y explosiones (nueva, solo visible si `bevel > 0`).
  - `blocks: Record<BlockColor, string>`: un color por cada `BlockColor` de `levels.ts` (`red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`, `gray`). Los nombres siguen siendo los ids de fila de `levels.js`; en `retro` no coinciden con el tono pintado.
- **Se elimina `BLOCK_COLORS`** de `entities.ts`: sus valores pasan a la skin `neon`.
- **Dibujo** en `entities.ts`, sin colores literales:
  - `drawRect()` recibe la paleta y los ajustes de render: pinta el bloque, luego el brillo superior de `min(highlightHeight, h / 3)` px con `highlight` y, si `bevel > 0`, una sombra inferior de `bevel` px con `shade`. Brillo y sombra sin glow, como hoy el brillo.
  - `drawPaddle()` pinta la cápsula con `paddle` y, si `paddleTrim` es distinto de `paddle`, rellena 10 px de cada extremo con `paddleTrim`, recortado a la misma cápsula (`clip`) y con `shadowBlur = 0`.
  - `drawBlock()`, `drawExplosion()` y `drawBall()` mantienen formas, tamaños, separación de 2 px y los 4 fotogramas de explosión.
- **Skins** en `lib/engines/arkanoid/skins.ts`: `ARKANOID_SKINS: Record<SkinId, ArkanoidSkin>`, donde `ArkanoidSkin = SkinDef<"background" | "paddle" | "paddleTrim" | "ball" | "highlight" | "shade"> & { blocks: Record<BlockColor, SkinColor>; highlightHeight: number; bevel: number }`. Los bloques se resuelven con una segunda llamada a `resolveColors`.
- **Motor** (`lib/engines/arkanoid/engine.ts`):
  - Se eliminan `readPalette()` y `GLOW`.
  - La factory acepta `options` y resuelve `ARKANOID_SKINS[options.skin]` en `applySkin(id)`, que guarda paleta, `glow`, `highlightHeight` y `bevel` en variables de la instancia (mismo patrón que `lib/engines/asteroids/engine.ts`).
  - `draw()` pinta el fondo con `palette.background` y usa el `glow` de la skin activa.
  - `setSkin(id)` llama a `applySkin(id)` y, si la fase es `ready` o `paused`, a `draw()`.
  - Las explosiones ya guardan `color: BlockColor` (un rol, no un hex), así que una explosión en curso cambia de color con la skin sin tocar `Explosion`.
- **Registro:** `GAME_META.arkanoid.hasSkins = true`.

**Fuera de alcance (para futuras specs):**

- Skins de Tetris y Snake.
- Usar el spritesheet del original (`references/started-games/04-arkanoid/assets/spritesheet-breakout.png`) o cualquier asset nuevo.
- Fondo con patrón o marco de paredes dibujado en el canvas.
- Scanlines dibujadas en el canvas.
- Cambiar tamaños de paleta, pelota o bloques, la separación entre bloques o la duración de la explosión.
- Sonido, power-ups o cualquier cambio de reglas.
- Cambiar la portada `cover-bricks`.

---

## Paletas

### Colores

`neon` usa `{ cssVar, fallback }` donde la tabla indica variable; el resto son hex fijos. Contraste calculado contra el `background` de la propia skin (WCAG, luminancia relativa).

| Clave            | Qué pinta                                                    | `clasico`               | `neon`                           | `retro`                          |
| ---------------- | ------------------------------------------------------------ | ----------------------- | -------------------------------- | -------------------------------- |
| `background`     | Fondo del canvas (`fillRect` de 800×600 en cada `draw`)      | `#000000`               | `#000000` (fijo, como hoy)       | `#140a00`                        |
| `paddle`         | Cuerpo de la paleta (cápsula 81×14)                          | `#c8ccd6`               | `--cyan` / `#00f5ff`             | `#ffe8b0`                        |
| `paddleTrim`     | Remates de 10 px en los extremos de la paleta                | `#c02020`               | `--magenta` / `#ff006e`          | `#b86800`                        |
| `ball`           | Pelota (círculo de 16 px)                                    | `#ffffff`               | `--ink` / `#e6e9ff`              | `#ffe8b0`                        |
| `highlight`      | Brillo superior de bloques y explosiones                     | `rgba(255,255,255,0.3)` | `rgba(255,255,255,0.18)` (hoy)   | `rgba(255,232,176,0.3)`          |
| `shade`          | Sombra inferior de bloques y explosiones (solo si `bevel>0`) | `rgba(0,0,0,0.35)`      | `rgba(0,0,0,0.35)` (no se pinta) | `rgba(0,0,0,0.35)` (no se pinta) |
| `blocks.red`     | Bloques rojos (nivel 1 fila 1, nivel 4 fila 6)               | `#e03030`               | `#ff3b3b`                        | `#b86800`                        |
| `blocks.yellow`  | Bloques amarillos                                            | `#f0d000`               | `--yellow` / `#f5ff00`           | `#ffb000`                        |
| `blocks.cyan`    | Bloques cian (incluido el marco del nivel 5)                 | `#00c8e0`               | `--cyan` / `#00f5ff`             | `#e08800`                        |
| `blocks.magenta` | Bloques magenta                                              | `#c040d0`               | `--magenta` / `#ff006e`          | `#b86800`                        |
| `blocks.hotpink` | Bloques rosa (incluida la cruz del nivel 5)                  | `#f070b0`               | `#ff5ec8`                        | `#9a5400`                        |
| `blocks.green`   | Bloques verdes                                               | `#30c040`               | `--green` / `#00ff88`            | `#e08800`                        |
| `blocks.gray`    | Bloques grises (nivel 2 fila 1)                              | `#a0a0a8`               | `#9aa7b8`                        | `#9a5400`                        |

Las explosiones usan el color de su bloque en las 3 skins, como hoy.

### Contraste contra el fondo

| Elemento         | `clasico` | `neon` | `retro` |
| ---------------- | --------- | ------ | ------- |
| `paddle`         | 13,1:1    | 15,5:1 | 16,2:1  |
| `paddleTrim`     | 3,5:1     | 5,5:1  | 4,7:1   |
| `ball`           | 21:1      | 17,5:1 | 16,2:1  |
| `blocks.red`     | 4,6:1     | 5,9:1  | 4,7:1   |
| `blocks.yellow`  | 13,7:1    | 19,2:1 | 10,7:1  |
| `blocks.cyan`    | 10,3:1    | 15,5:1 | 7,2:1   |
| `blocks.magenta` | 4,9:1     | 5,5:1  | 4,7:1   |
| `blocks.hotpink` | 7,7:1     | 7,7:1  | 3,4:1   |
| `blocks.green`   | 8,7:1     | 15,7:1 | 7,2:1   |
| `blocks.gray`    | 8,1:1     | 8,6:1  | 3,4:1   |

Todos los elementos jugables superan el objetivo de 3:1.

### Tonos de `retro` por nivel

`retro` es ámbar monocromo con 6 tonos: fondo `#140a00` y, de más a menos brillante, `#ffe8b0` (paleta y pelota), `#ffb000`, `#e08800`, `#b86800` y `#9a5400`.
El reparto de los 7 colores de bloque en 4 tonos garantiza que dos filas contiguas nunca comparten tono en ningún nivel:

| Nivel | Filas de arriba abajo                       | Tonos `retro`                                                    |
| ----- | ------------------------------------------- | ---------------------------------------------------------------- |
| 1     | red, yellow, cyan, magenta, hotpink, green  | `#b86800`, `#ffb000`, `#e08800`, `#b86800`, `#9a5400`, `#e08800` |
| 2     | gray, cyan, hotpink, yellow, magenta, green | `#9a5400`, `#e08800`, `#9a5400`, `#ffb000`, `#b86800`, `#e08800` |
| 3     | yellow (filas 1–3), magenta (filas 4–6)     | `#ffb000`, `#b86800`                                             |
| 4     | cyan, magenta, green, yellow, hotpink, red  | `#e08800`, `#b86800`, `#e08800`, `#ffb000`, `#9a5400`, `#b86800` |
| 5     | marco cyan, cruz hotpink                    | `#e08800` (marco), `#9a5400` (cruz)                              |

### Render

| Ajuste                          | `clasico`       | `neon`                 | `retro`                |
| ------------------------------- | --------------- | ---------------------- | ---------------------- |
| `glow` (`shadowBlur` por grupo) | `0`             | `10` (actual `GLOW`)   | `3`                    |
| `highlightHeight` (px, máx h/3) | `3`             | `4` (actual)           | `0` (sin brillo)       |
| `bevel` (px de sombra inferior) | `3`             | `0`                    | `0`                    |
| Remates de la paleta            | sí, rojo oscuro | sí, magenta            | sí, ámbar oscuro       |
| `shadowColor`                   | sin efecto      | color de cada elemento | color de cada elemento |
| Separación entre bloques        | 2 px            | 2 px                   | 2 px                   |
| Scanlines en el canvas          | no              | no                     | no                     |
| Fondo                           | negro puro      | negro puro             | marrón muy oscuro      |

Tamaños y formas son los actuales en las 3 skins: paleta cápsula 81×14 con radio 7, pelota círculo de 16 px, bloques 62×22 visibles, explosión que crece ×1,15 por fotograma y se desvanece en alpha 1 / 0,75 / 0,5 / 0,25.

### Notas por skin

- **`clasico` (ladrillos de arcade sobre negro):** fondo `#000` como `game.js`.
  - Bloques sólidos con bisel: brillo superior de 3 px y sombra inferior de 3 px, sin glow. Imita los ladrillos con relieve del arcade y del spritesheet del original sin usar el asset.
  - Los colores siguen los nombres de fila de `levels.js` (rojo, amarillo, cian, magenta, rosa, verde y gris plata) en tonos sólidos, menos saturados que el neón. No se copian los tonos del spritesheet: ahí la fila `cyan` es verde azulado, `green` es azul y `hotpink` es naranja, y el criterio de SPEC 11 (fila 1 roja, luego amarilla, cian, magenta, rosa y verde) dejaría de cumplirse.
  - Paleta plateada `#c8ccd6` con remates rojo oscuro `#c02020`, como la nave-paleta del arcade y el sprite `paddle` del original. El rojo de los remates es más oscuro que el de los bloques `#e03030` para no compartir color.
  - Pelota blanca `#ffffff`, el elemento más brillante del canvas.
- **`neon` (estética de la plataforma):** el render actual, ahora registrado y con fondo explícito, con un único cambio: remates magenta en la paleta.
  - Sin remates, la paleta `--cyan` comparte color con los bloques `cyan` (filas enteras y el marco del nivel 5). Los remates `--magenta` la hacen única sin cambiar su color principal.
  - El resto (bloques, pelota `--ink`, brillo 0,18 de 4 px, glow 10) es idéntico a hoy.
- **`retro` (monitor de fósforo ámbar):** 6 tonos de un solo matiz, sin brillo ni bisel.
  - Paleta y pelota comparten el tono más brillante `#ffe8b0`. Se distinguen por forma y posición: cápsula de 81×14 fija en `y = 560` frente a círculo de 16 px en movimiento. Ningún bloque usa ese tono.
  - Los remates de la paleta van en `#b86800` para mantener la silueta de las otras skins.
  - Glow suave de 3, el halo del fósforo.
  - Sin scanlines en el canvas: `.crt-screen::after` ya las pone sobre todas las skins.
  - La transparencia de las explosiones genera tonos intermedios del mismo ámbar durante 150 ms; no añade matices.

### Assets

Arkanoid no usa sprites ni archivos en `public/games/arkanoid/`: todo se dibuja con rectángulos y círculos (SPEC 11 descartó el spritesheet). Las 3 skins solo cambian colores y el bisel. No hace falta ningún asset nuevo.

---

## Plan de implementación

Requiere SPEC 13 implementada (`SkinId`, `SkinDef`, `SkinColor`, `resolveColors`, `setSkin` en el contrato, `hasSkins` en `GameMeta` y `SkinPicker`).

1. **Paleta y dibujo.** En `lib/engines/arkanoid/entities.ts`, ampliar `Palette` con `background`, `paddleTrim`, `highlight` y `shade`, eliminar `BLOCK_COLORS`, y cambiar `drawRect`, `drawBlock`, `drawExplosion` y `drawPaddle` para recibir la paleta y los ajustes (`highlightHeight`, `bevel`) en vez del `rgba` fijo. Actualizar el comentario de cabecera (los colores vienen de la skin activa). Verificar: `npm run build` pasa.
2. **Skins.** Crear `lib/engines/arkanoid/skins.ts` con `ArkanoidSkin` y `ARKANOID_SKINS` con los valores de las tablas de esta spec. `neon` usa `{ cssVar, fallback }` para `paddle`, `paddleTrim`, `ball`, `blocks.cyan`, `blocks.yellow`, `blocks.magenta` y `blocks.green`. Verificar: `npm run build` pasa.
3. **Motor.** En `engine.ts`, quitar `readPalette` y `GLOW`, añadir el parámetro `options`, crear `applySkin(id)` y usar `background`, `glow`, `highlightHeight` y `bevel` en `draw()`. Verificar: con `av:skin:v1:arkanoid = "neon"` en `localStorage`, el canvas se ve como antes salvo los remates magenta de la paleta.
4. **`setSkin`.** Sustituir el no-op por la versión real: llama a `applySkin(id)` y a `draw()` en `ready` y `paused`. Verificar: cambiar a `retro` desde el selector en pausa cambia el canvas al momento.
5. **Activar.** Poner `GAME_META.arkanoid.hasSkins = true`. Verificar: `/games/arkanoid/play` muestra el selector `MODO · CLÁSICO · NEÓN · RETRO` en `.crt-bottom` y cambia la skin en caliente.
6. **Cierre.** Recorrer los criterios de aceptación en el navegador (Playwright MCP) con las 3 skins y los 5 niveles. `npm run lint` y `npm run build`.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores ni warnings de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] `ARKANOID_SKINS` está tipado `Record<SkinId, ArkanoidSkin>` y cada skin define las 6 claves de color, los 7 colores de `blocks`, `glow`, `highlightHeight` y `bevel`.
- [ ] Quitar un `BlockColor` de `blocks` en cualquier skin hace fallar `npm run build`.
- [ ] `engine.ts` y `entities.ts` no contienen ningún color literal (`"#000"`, hex ni `rgba`) fuera de `skins.ts`.
- [ ] `clasico` es la skin por defecto: con `localStorage` vacío, `/games/arkanoid/play` muestra fondo negro, bloques sólidos con bisel y sin glow, paleta plateada con remates rojo oscuro y pelota blanca.
- [ ] En `clasico`, el nivel 1 muestra de arriba abajo filas roja, amarilla, cian, magenta, rosa y verde.
- [ ] Con `neon`, bloques, pelota, fondo, brillo y glow son idénticos a los de antes de esta spec, y la paleta es cian con remates magenta.
- [ ] Con `retro`, todo el canvas usa solo los 6 tonos ámbar de la tabla, con fondo `#140a00`, y en ninguno de los 5 niveles dos filas contiguas comparten tono.
- [ ] En `retro`, el nivel 5 muestra el marco y la cruz en tonos distintos.
- [ ] El selector muestra `CLÁSICO`, `NEÓN` y `RETRO`, y el botón activo tiene `aria-pressed="true"`.
- [ ] Cambiar de skin durante `playing` no reinicia la partida: puntuación, vidas, nivel, bloques vivos y posición de pelota y paleta se mantienen.
- [ ] Cambiar de skin en `paused` redibuja el canvas al momento y la partida sigue en pausa.
- [ ] Cambiar de skin en `ready` redibuja la pantalla inicial y la partida no empieza.
- [ ] Una explosión en curso cambia de color al cambiar de skin.
- [ ] Después de pulsar un botón del selector con el ratón, mover el ratón sobre el canvas mueve la paleta y pulsar Espacio no cambia la skin.
- [ ] Recargar `/games/arkanoid/play` conserva la última skin elegida (`av:skin:v1:arkanoid`).
- [ ] JUGAR DE NUEVO mantiene la skin elegida.
- [ ] La puntuación y la jugabilidad no cambian entre skins: cada bloque vale 10, los 5 niveles suman 2.080, y tamaños de paleta, pelota y bloques, velocidades por nivel y colisiones son los mismos en las 3 skins.
- [ ] Una partida con cualquier skin se guarda en `scores` igual que hoy y `saveScore` sigue validando con `scoreStep = 10`.
- [ ] El HUD React, los overlays de la CRT y el modal de fin se ven igual en las 3 skins.
- [ ] La consola no muestra errores ni avisos de hidratación en `/games/arkanoid/play`.
- [ ] Asteroids sigue con sus 3 skins, y Tetris y Snake no muestran selector y se ven igual que antes.

---

## Decisiones

- **Sí:** `background`, `highlight` y `shade` como claves de la paleta. Eran los colores fijos del canvas (`"#000"` y `"rgba(255,255,255,0.18)"`) y `retro` necesita su propio fondo.
- **Sí:** `blocks` como sub-registro `Record<BlockColor, SkinColor>` resuelto con una segunda llamada a `resolveColors`. Mantiene los ids de fila de `levels.ts` y obliga a cada skin a definir los 7 colores.
- **No:** claves planas tipo `blockRed`. Duplican los ids de `BlockColor` y añadir un color de bloque no obligaría a definirlo.
- **No:** claves propias para explosiones. Usan el color de su bloque en las 3 skins, como hoy y como los fotogramas por color del original.
- **Sí:** `paddleTrim`. Da a la paleta de `clasico` el aspecto del original (cápsula plateada con extremos rojos) y separa la paleta de los bloques cian en `neon`. Es solo color dentro de la misma cápsula: la hitbox no cambia.
- **Sí:** remates magenta en `neon`, aunque cambie ligeramente el render actual. Sin ellos la paleta comparte `--cyan` con filas enteras de bloques y con el marco del nivel 5, y la regla de legibilidad pide que roles distintos no compartan color fuera de `retro`.
- **No:** cambiar el color principal de la paleta en `neon`. Las 4 variables de `:root` ya pintan bloques y `--ink` es la pelota; cualquier otro color rompería el look neón actual más que unos remates.
- **Sí:** `clasico` con colores según los nombres de `levels.js` y bisel, sin sprites. Es fiel a la idea de ladrillos sólidos con relieve del arcade y del original portado, y mantiene los criterios de color por fila de SPEC 11.
- **No:** usar `spritesheet-breakout.png` en `clasico`. SPEC 11 lo descartó (pixel-art pastel con atribución), obligaría a cargar un asset y sus tonos no coinciden con los nombres de fila.
- **No:** fondo azul con patrón del arcade en `clasico`. Exige dibujar o cargar un patrón y baja el contraste de los bloques oscuros; `game.js` usa negro.
- **Sí:** `retro` en ámbar monocromo. Con fondo oscuro permite 5 tonos por encima de 3:1, suficientes para que paleta y pelota tengan un tono propio y las filas contiguas nunca se repitan.
- **No:** `retro` de 4 tonos handheld con fondo claro. Contra el tono más claro solo los 2 tonos oscuros superan 3:1, demasiado pocos para 7 colores de bloque más paleta y pelota.
- **No:** `retro` en fósforo verde. Lo usa Asteroids; el ámbar da variedad entre juegos y se lee bien en rectángulos grandes.
- **Sí:** paleta y pelota con el mismo tono en `retro`. Lo permite la regla de `retro` y se distinguen por forma, tamaño y posición; ningún bloque usa ese tono.
- **Sí:** sin brillo ni bisel en `retro`. Añadirían tonos fuera de la paleta corta; la separación de 2 px basta para leer cada bloque.
- **Sí:** glow 0 en `clasico`, 10 en `neon` y 3 en `retro`. El original no tenía glow, el neón actual usa 10 y el fósforo tiene un halo suave.
- **No:** scanlines en el canvas. La CRT ya aplica `.crt-screen::after` a todas las skins.
- **No:** tamaños, radios o separación distintos por skin. Una paleta o pelota que pareciera más grande confundiría la hitbox real.
- **Sí:** `clasico` por defecto. Cambia lo que ve hoy el jugador (neón) a ladrillos sólidos sin glow; NEÓN sigue a un clic y se recuerda por juego.

---

## Riesgos

| Riesgo                                                                           | Mitigación                                                                                                                       |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Los jugadores actuales esperan el look neón y ven ladrillos sin glow             | El selector está a la vista en la CRT y la elección se guarda. `neon` mantiene el render actual salvo los remates.               |
| Los remates magenta en `neon` se perciben como un cambio no pedido               | Son 10 px por extremo y se justifican por legibilidad. Si se rechazan, basta con poner `paddleTrim` igual a `paddle`.            |
| En `retro`, filas con el mismo tono se funden en niveles no contiguos            | Las filas contiguas nunca comparten tono (tabla por nivel) y la separación de 2 px marca cada bloque.                            |
| En `retro`, `blocks.hotpink` y `blocks.gray` quedan cerca del mínimo (3,4:1)     | Superan 3:1 y son el tono más oscuro por diseño. Si cuesta leerlos, se sube `#9a5400` sin acercarlo a `#b86800`.                 |
| El `clip` de los remates deja el `shadowColor` o el clip activos                 | Los remates se dibujan entre `save()` y `restore()` con `shadowBlur = 0`. `draw()` fija `shadowBlur` al principio de cada grupo. |
| `setSkin` en `ready` o `paused` no se ve porque el bucle solo pinta en `playing` | `setSkin` llama a `draw()` en esas fases. Criterios en `ready` y `paused`.                                                       |
| El bisel de `clasico` en explosiones escaladas se ve desproporcionado            | `highlightHeight` se limita a `h / 3` como hoy y la sombra usa los mismos `bevel` px; la explosión dura 150 ms.                  |

---

## Lo que **no** entra en esta spec

- Skins de Tetris y Snake.
- Sprites del original o assets nuevos.
- Fondo con patrón, paredes dibujadas o scanlines en el canvas.
- Formas, tamaños o separaciones distintos por skin.
- Sonido, power-ups o cambios de reglas.
- Portada nueva.

Cada uno de estos puntos, si llega, va en su propia spec.


# SPEC 16 — Skins de SNAKE

> **Estado:** Aprobado
> **Depende de:** SPEC 13, SPEC 12
> **Fecha:** 2026-10-19
> **Objetivo:** Dar a Snake sus 3 skins de canvas (`clasico` por defecto, `neon` y `retro`) con paletas completas en `lib/engines/snake/skins.ts`, seleccionables en caliente desde el player, con el mismo patrón que SPEC 14 (Asteroids).

---

## Por qué existe esta spec

El motor de Snake (`lib/engines/snake/`) pinta hoy con una única paleta neón leída de `:root` en `readPalette()` (`engine.ts`): cuerpo y rejilla `--green`, cabeza `--ink` y fruta de respaldo `--magenta`.
Fuera de la paleta tiene valores fijos: el fondo `"#000"` en `draw()`, el glow `GLOW = 10` en `engine.ts` y la opacidad de la rejilla `GRID_ALPHA = 0.08` en `entities.ts`.
La fruta es un sprite a todo color (`public/games/snake/fruits.png`, 22 frutas pixel-art) que se pinta tal cual con `drawImage`, y no hay forma de adaptarlo a una paleta corta.
`setSkin` es un no-op y `GAME_META.snake.hasSkins` vale `false`, así que el jugador ve siempre neón aunque `DEFAULT_SKIN` sea `clasico`.
Eso equivale a un `neon` parcial y no registrado, y el look por defecto no es el clásico.
Snake no tiene un `game.js` de referencia (SPEC 12 lo diseñó desde cero), así que `clasico` se basa en el Snake de recreativa original: bloques claros sobre negro, sin rejilla ni glow.
Esta spec completa la paleta, define las 3 skins y activa el selector de SPEC 13 para Snake.

---

## Alcance

**Dentro:**

- **Paleta completa** en `lib/engines/snake/entities.ts`: `Palette` gana `background` y `fallbackFruit` pasa a llamarse `fruit`. Quedan 5 claves: `background`, `grid`, `body`, `head`, `fruit`.
  - `fruit` pinta el núcleo circular de respaldo si el sprite no carga y, en las skins con `fruitStyle = "tint"`, el color de la silueta del sprite.
- **Rejilla por skin:** `drawGrid(ctx, color, alpha)` recibe la opacidad en vez de usar `GRID_ALPHA`. Con `alpha = 0` no dibuja nada.
- **Fruta por skin:** campo de render `fruitStyle: "sprite" | "tint"`.
  - `sprite`: el atlas se pinta a todo color, como hoy.
  - `tint`: el motor genera una copia del atlas en un canvas fuera de pantalla (mismo tamaño, 3790×160) pintando el sprite y rellenando con `palette.fruit` en modo `source-in`. Resultado: la silueta de cada fruta en un solo tono. Se genera al cargar el sprite y al aplicar una skin `tint`, y se guarda mientras la skin no cambie.
  - No hace falta ningún asset nuevo.
- **Skins** en `lib/engines/snake/skins.ts`: `SNAKE_SKINS: Record<SkinId, SnakeSkin>`, donde `SnakeSkin = SkinDef<keyof Palette> & { gridAlpha: number; fruitStyle: "sprite" | "tint" }`.
- **Motor** (`lib/engines/snake/engine.ts`):
  - Se eliminan `readPalette()` y `GLOW`, y `GRID_ALPHA` de `entities.ts`.
  - La factory recibe `options` y resuelve `SNAKE_SKINS[options.skin]` con `resolveColors` en una función `applySkin(id)`, como Asteroids. Guarda paleta, `glow`, `gridAlpha` y `fruitStyle` en variables de la instancia.
  - `draw()` pinta el fondo con `palette.background`, la rejilla con `gridAlpha`, la fruta con el atlas original o el teñido según `fruitStyle`, y usa `glow` de la skin.
  - `setSkin(id)` vuelve a llamar a `applySkin`. Si la fase es `ready` o `paused`, llama a `draw()`.
- **Registro:** `GAME_META.snake.hasSkins = true`.
- Tamaños de celda (25 px), margen de segmento (`SEGMENT_INSET = 2`), radio del núcleo de respaldo (`CELL * 0.32`), escalado del sprite y grosor de la rejilla (1 px) se mantienen iguales en las 3 skins.
- Actualizar los comentarios de cabecera de `entities.ts` y `engine.ts` (ya no es "neon vector snake" fijo: los colores vienen de la skin activa).

**Fuera de alcance (para futuras specs):**

- Skins de Tetris y Arkanoid.
- Sprites para la serpiente (cabeza, cuerpo, cola) o formas distintas por skin.
- Fondo a cuadros tipo césped.
- Filas emoji o realista de la hoja de frutas.
- Scanlines o efecto de persistencia del LCD en el canvas.
- Cambiar la portada `cover-snake`.
- Cualquier cambio de reglas, velocidades o puntuación.

---

## Paletas

### Colores

Contraste calculado contra el `background` de la propia skin (WCAG, luminancia relativa).

| Clave        | Qué pinta                                                                  | `clasico`                 | `neon`                     | `retro`   |
| ------------ | -------------------------------------------------------------------------- | ------------------------- | -------------------------- | --------- |
| `background` | Fondo del canvas (`fillRect` de 800×600 en cada `draw`)                    | `#000000`                 | `#000000` (fijo, como hoy) | `#c4cfa1` |
| `grid`       | Líneas de la rejilla de 32×24 (1 px, con `gridAlpha`)                      | `#ffffff` (no se ve)      | `--green` / `#00ff88`      | `#8b9c6b` |
| `body`       | Segmentos del cuerpo (todos menos el primero) y su glow                    | `#a8a8a8`                 | `--green` / `#00ff88`      | `#4d5b37` |
| `head`       | Primer segmento y su glow                                                  | `#ffffff`                 | `--ink` / `#e6e9ff`        | `#1f2a14` |
| `fruit`      | Núcleo de respaldo si el sprite no carga; silueta del sprite en modo tinte | `#ff3b30` (solo respaldo) | `--magenta` / `#ff006e`    | `#1f2a14` |

### Contraste contra el fondo

| Elemento                      | `clasico`                 | `neon`                    | `retro`           |
| ----------------------------- | ------------------------- | ------------------------- | ----------------- |
| `body`                        | 8,8:1                     | 15,7:1                    | 4,5:1             |
| `head`                        | 21:1                      | 17,5:1                    | 9,1:1             |
| `fruit` (respaldo o silueta)  | 5,9:1                     | 5,5:1                     | 9,1:1             |
| Sprite a todo color (peor)    | ≈ 3,5:1 (berenjena, uvas) | ≈ 3,5:1 (berenjena, uvas) | no aplica         |
| `grid` (decorativo, no juega) | sin rejilla               | muy tenue (alpha 0,08)    | 1,8:1 a alpha 0,4 |

Todos los elementos jugables superan el objetivo de 3:1. La rejilla es decoración y queda a propósito por debajo para no competir con la serpiente.
Contraste cabeza / cuerpo: 2,4:1 en `clasico`, 1,1:1 en `neon` (se distinguen por tono: verde frente a blanco azulado, como hoy) y 4,6:1 en `retro`.

### Render

| Ajuste                  | `clasico`   | `neon`               | `retro`              |
| ----------------------- | ----------- | -------------------- | -------------------- |
| `glow` (`shadowBlur`)   | `0`         | `10` (actual `GLOW`) | `0`                  |
| `shadowColor`           | sin efecto  | color de cada grupo  | sin efecto           |
| `gridAlpha`             | `0`         | `0.08` (actual)      | `0.4`                |
| `fruitStyle`            | `sprite`    | `sprite`             | `tint`               |
| `imageSmoothingEnabled` | `false`     | `false`              | `false`              |
| Grosor de la rejilla    | no se pinta | 1 px                 | 1 px                 |
| Scanlines en el canvas  | no          | no                   | no                   |
| Fondo                   | negro puro  | negro puro           | verde grisáceo claro |

### Notas por skin

- **`clasico` (recreativa original de bloques):** el Snake de recreativa de los 70 eran bloques blancos sobre negro, sin rejilla ni brillo.
  - Cuerpo gris claro `#a8a8a8` y cabeza blanca `#ffffff`: la cabeza es el bloque más brillante y se lee como la punta que avanza, sin compartir color con el cuerpo.
  - Sin rejilla (`gridAlpha = 0`), fiel a la recreativa. El borde del tablero lo marca el propio marco de la CRT.
  - Las frutas se pintan a todo color con el sprite actual: es el arte original del juego y todas se leen sobre negro (la más oscura, la berenjena, ronda 3,5:1).
  - Respaldo rojo `#ff3b30` en vez de magenta: una fruta roja encaja mejor con el look clásico y no comparte color con la serpiente.
- **`neon` (estética de la plataforma):** es exactamente el look actual, ahora registrado y con fondo explícito.
  - Cuerpo y rejilla comparten `--green` como hoy. La rejilla no es un elemento jugable y su alpha de 0,08 la deja muy por debajo del cuerpo.
- **`retro` (LCD monocromo de 4 tonos, tipo teléfono o consola portátil):** `#c4cfa1` (fondo), `#8b9c6b` (rejilla), `#4d5b37` (cuerpo) y `#1f2a14` (cabeza y fruta).
  - Snake se popularizó en pantallas LCD monocromas y sus bloques rellenos de 21 px son el caso ideal para esa pantalla.
  - La cabeza va en el tono más oscuro y el cuerpo en el tono medio: se distinguen por brillo.
  - La fruta comparte el tono más oscuro con la cabeza. Lo permite la regla de `retro`: la fruta es una silueta irregular (manzana, plátano, cerezas...) y la cabeza es un cuadrado, así que se distinguen por forma.
  - El sprite a todo color no cabe en 4 tonos, por eso se tiñe en silueta (`fruitStyle = "tint"`). Sigue cambiando de fruta en cada aparición, como en las otras skins.
  - Rejilla visible a alpha 0,4, que imita la retícula de píxeles del LCD sin competir con la serpiente.
  - Sin glow: un LCD no emite luz.
  - Sin scanlines en el canvas: `.crt-screen::after` ya las pone sobre todas las skins.

### Assets

Snake usa un único asset, `public/games/snake/fruits.png` (atlas pixel-art de 22 frutas a todo color).

| Skin      | Uso del sprite                                    | Asset nuevo |
| --------- | ------------------------------------------------- | ----------- |
| `clasico` | Se pinta tal cual                                 | No          |
| `neon`    | Se pinta tal cual (como hoy)                      | No          |
| `retro`   | Se recolorea en el canvas como silueta de `fruit` | No          |

Si el sprite no carga, las 3 skins pintan el núcleo circular de respaldo con su `fruit`.

---

## Plan de implementación

Requiere SPEC 13 implementada (`SkinId`, `SkinDef`, `resolveColors`, `setSkin` en el contrato, `hasSkins` en `GameMeta` y `SkinPicker`). Seguir el patrón de `lib/engines/asteroids/skins.ts` y `applySkin` en `lib/engines/asteroids/engine.ts`.

1. **Paleta y helpers.** En `lib/engines/snake/entities.ts`, añadir `background` a `Palette`, renombrar `fallbackFruit` a `fruit`, quitar `GRID_ALPHA` y añadir el parámetro `alpha` a `drawGrid` (si es `0`, sale sin dibujar). `drawFruit` recibe la imagen a usar (original o teñida) y sigue igual por dentro. Actualizar el comentario de cabecera. Verificar: `npm run build` pasa.
2. **Skins.** Crear `lib/engines/snake/skins.ts` con `SnakeSkin` y `SNAKE_SKINS` con los valores de las tablas de esta spec. `neon` usa `{ cssVar, fallback }` para `grid`, `body`, `head` y `fruit`. Verificar: `npm run build` pasa.
3. **Motor.** En `engine.ts`, quitar `readPalette` y `GLOW`, añadir el parámetro `options` a la factory, crear `applySkin(id)` y usar `background`, `gridAlpha` y `glow` en `draw()`. Verificar: con `av:skin:v1:snake = "neon"` en `localStorage`, el juego se ve igual que antes de esta spec.
4. **Fruta teñida.** En `engine.ts`, crear la copia teñida del atlas (canvas fuera de pantalla, `drawImage` del atlas y `fillRect` con `palette.fruit` en `source-in`) cuando el sprite carga y en `applySkin` si la skin es `tint`. `draw()` pasa a `drawFruit` el atlas teñido en `tint` y el original en `sprite`. Verificar: con `retro`, la fruta se ve como silueta oscura sobre el fondo claro y sin bordes de las frutas vecinas.
5. **`setSkin`.** Sustituir el no-op por la versión real: llama a `applySkin` y a `draw()` en `ready` y `paused`. Verificar: con el juego en pausa, cambiar a `retro` desde el selector cambia el canvas al momento.
6. **Activar.** Poner `GAME_META.snake.hasSkins = true`. Verificar: `/games/snake/play` muestra el selector `MODO · CLÁSICO · NEÓN · RETRO` en `.crt-bottom` y cambia la skin en caliente.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores ni warnings de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] `SNAKE_SKINS` está tipado `Record<SkinId, SnakeSkin>` y cada skin define las 5 claves de `Palette`, `glow`, `gridAlpha` y `fruitStyle`.
- [ ] `engine.ts` y `entities.ts` no contienen ningún color literal (`"#000"`, hex ni `rgba`) fuera de `skins.ts`.
- [ ] `clasico` es la skin por defecto: con `localStorage` vacío, `/games/snake/play` muestra fondo negro sin rejilla, cuerpo gris claro, cabeza blanca, frutas a todo color y sin glow.
- [ ] Con `neon`, el canvas es idéntico al de antes de esta spec (cuerpo verde, cabeza blanco azulado, rejilla verde tenue, glow 10, frutas a todo color).
- [ ] Con `retro`, todo el canvas usa solo los 4 tonos de la tabla, con el fondo `#c4cfa1` y la fruta como silueta `#1f2a14`.
- [ ] Con `retro`, ninguna fruta muestra trozos de las frutas vecinas del atlas.
- [ ] Bloqueando la carga de `/games/snake/fruits.png`, cada skin pinta el núcleo de respaldo con su color `fruit` y el juego se puede jugar.
- [ ] El selector muestra `CLÁSICO`, `NEÓN` y `RETRO`, y el botón activo tiene `aria-pressed="true"`.
- [ ] Cambiar de skin durante `playing` no reinicia la partida: puntuación, nivel, longitud y posición de la serpiente, dirección y fruta actual se mantienen.
- [ ] Cambiar de skin en `paused` redibuja el canvas al momento y la partida sigue en pausa.
- [ ] Cambiar de skin en `ready` redibuja la pantalla inicial y la partida no empieza.
- [ ] Después de pulsar un botón del selector con el ratón, pulsar Espacio en `ready` empieza la partida y no cambia la skin, y las flechas mueven la serpiente.
- [ ] Recargar `/games/snake/play` conserva la última skin elegida (`av:skin:v1:snake`).
- [ ] JUGAR DE NUEVO mantiene la skin elegida.
- [ ] La puntuación y la jugabilidad no cambian entre skins: cada fruta vale 10, el nivel sube cada 5 frutas, la velocidad va de 8 a 20 pasos/s y el tablero sigue siendo de 32×24 celdas de 25 px en las 3 skins.
- [ ] Una partida con cualquier skin se guarda en `scores` igual que hoy y `saveScore` sigue validando con `scoreStep = 10`.
- [ ] El HUD React, los overlays de la CRT y el modal de fin se ven igual en las 3 skins.
- [ ] La consola no muestra errores ni avisos de hidratación en `/games/snake/play`.
- [ ] Asteroids conserva sus 3 skins, y Tetris y Arkanoid no muestran selector y se ven igual que antes.

---

## Decisiones

- **Sí:** `background` como clave de la paleta. Era el color fijo `"#000"` de `draw()` y `retro` necesita un fondo claro.
- **Sí:** renombrar `fallbackFruit` a `fruit`. En `retro` deja de ser solo el respaldo y pasa a ser el color de la silueta de la fruta.
- **Sí:** `gridAlpha` como campo de render por skin en vez de la constante `GRID_ALPHA`. `clasico` no tiene rejilla, `neon` la mantiene en 0,08 y `retro` la necesita más visible para imitar la retícula del LCD.
- **Sí:** `clasico` basado en el Snake de recreativa de bloques (claros sobre negro, sin rejilla ni glow). No hay `game.js` de referencia y ese es el look original del género.
- **No:** `clasico` con césped a cuadros verde claro y serpiente azul, como el Snake de navegador del que vienen los sprites. Las frutas verdes del atlas (brócoli, pimiento, kiwi) quedan por debajo de 3:1 sobre el césped y haría falta un modo de fondo nuevo.
- **No:** `clasico` todo en blanco. Cabeza y cuerpo son roles distintos y no deben compartir color fuera de `retro`.
- **Sí:** frutas a todo color en `clasico` y `neon`. Es el arte original del juego y todas se leen sobre negro.
- **Sí:** respaldo rojo `#ff3b30` en `clasico`. Una fruta roja es la comida típica del género y no se confunde con la serpiente gris y blanca.
- **Sí:** `neon` igual al render actual, incluido el fondo `#000000` en vez de `--bg`. Quien elija NEÓN ve exactamente lo de hoy.
- **Sí:** `retro` como LCD monocromo de 4 tonos. Es la pantalla con la que Snake se hizo popular, los bloques rellenos se leen muy bien y se diferencia del fósforo verde que ya usa Asteroids.
- **No:** `retro` en fósforo verde o ámbar sobre negro. Funcionaría, pero repetiría el `retro` de Asteroids y se parecería demasiado a `neon` (verde sobre negro).
- **Sí:** teñir el sprite en el canvas (`source-in`) para `retro`. Mantiene las 22 frutas distintas en forma con un solo tono y no necesita un asset nuevo.
- **No:** un `fruits-retro.png` aparte. Habría que mantener dos atlas con los mismos recortes y el teñido da el mismo resultado.
- **No:** usar el núcleo circular en `retro` en vez del sprite. Se perdería la variedad de frutas, que es lo que aporta el asset.
- **Sí:** cabeza y fruta comparten tono en `retro`. Lo permite la regla de `retro` y se distinguen por forma (cuadrado frente a silueta de fruta).
- **No:** glow en `clasico` y `retro`. La recreativa no lo tenía y un LCD no emite luz.
- **No:** scanlines en el canvas. La CRT ya aplica `.crt-screen::after` a todas las skins.
- **No:** tamaños, margen de segmento o grosores distintos por skin. Mantiene la misma lectura de celdas en las 3 skins y no hay riesgo de que parezca otra hitbox.
- **Sí:** `clasico` por defecto. Cambia lo que ve hoy el jugador (serpiente verde neón) a bloques grises y blancos sin glow; NEÓN sigue a un clic y se recuerda.

---

## Riesgos

| Riesgo                                                                | Mitigación                                                                                                                              |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Los jugadores actuales esperan la serpiente neón y ven bloques grises | El selector está a la vista en la CRT y la elección se guarda. Criterio: `neon` es idéntico al render actual.                           |
| En `retro`, el fondo claro deslumbra dentro de la CRT oscura          | El fondo `#c4cfa1` es un verde grisáceo apagado, no blanco. Si molesta, se oscurece el fondo sin tocar los otros 3 tonos.               |
| En `retro`, la fruta se confunde con la cabeza por compartir tono     | Siluetas irregulares frente a un cuadrado de 21 px. Si no basta, la fruta pasa al tono del cuerpo `#4d5b37` (4,5:1).                    |
| El teñido deja bordes de las frutas vecinas o se ve borroso           | Se tiñe el atlas completo con los mismos recortes de `sprites.ts` y `imageSmoothingEnabled = false`. Criterio de aceptación específico. |
| El sprite carga después de aplicar `retro` y la fruta sale sin teñir  | El atlas teñido se genera también en `img.onload` si la skin activa es `tint`.                                                          |
| Las frutas más oscuras (berenjena, uvas) se leen peor sobre negro     | Rondan 3,5:1 y ya se juegan así hoy en neón. No se cambian para no tocar el arte original.                                              |
| `setSkin` en `ready` o `paused` no se ve porque el bucle no pinta     | `setSkin` llama a `draw()` en esas fases. Criterios en `ready` y `paused`.                                                              |

---

## Lo que **no** entra en esta spec

- Skins de Tetris y Arkanoid.
- Sprites, formas o tamaños de la serpiente distintos por skin.
- Fondo a cuadros tipo césped.
- Filas emoji o realista del atlas de frutas.
- Scanlines o persistencia del LCD en el canvas.
- Portada nueva.
- Cambios de reglas, velocidades o puntuación.

Cada uno de estos puntos, si llega, va en su propia spec.


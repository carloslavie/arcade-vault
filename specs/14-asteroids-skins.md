# SPEC 14 — Skins de ASTEROIDS

> **Estado:** Implementado
> **Depende de:** SPEC 13, SPEC 05
> **Fecha:** 2026-10-16
> **Objetivo:** Dar a Asteroids sus 3 skins de canvas (`clasico` por defecto, `neon` y `retro`) con paletas completas en `lib/engines/asteroids/skins.ts`, seleccionables en caliente desde el player.

---

## Por qué existe esta spec

El motor de Asteroids (`lib/engines/asteroids/`) pinta hoy con una única paleta neón leída de `:root` en `readPalette()`: nave `--cyan`, asteroides `--magenta`, balas `--yellow`, power-up `--green` y llama `--yellow`.
Además tiene colores y ajustes fijos fuera de la paleta: el fondo `"#000"`, el glow `GLOW = 10` y `PARTICLE_GLOW = 4`.
Las partículas guardan el color al nacer (`new Particle(x, y, palette.ship)`), así que un cambio de skin no les llegaría.
Eso equivale a un `neon` parcial y no registrado, y el look por defecto no es el original.
El original de referencia (`references/started-games/02-asteroids/game.js`) son vectores blancos sobre negro, con el power-up cian y la llama naranja, sin glow.
Esta spec completa la paleta, define las 3 skins y activa el selector de SPEC 13 para Asteroids.

---

## Alcance

**Dentro:**

- **Paleta completa** en `lib/engines/asteroids/entities.ts`: `Palette` gana la clave `background`. Quedan 6 claves: `background`, `ship`, `flame`, `bullet`, `asteroid`, `powerUp`.
  - `powerUp` sigue pintando el rombo, el texto `3x` del power-up y el indicador `3x  N.Ns` de la esquina.
  - Las partículas usan `ship` o `asteroid` según lo que explota, como hoy.
- **Partículas por rol:** `Particle` guarda `kind: "ship" | "asteroid"` en vez de un color, y `draw(ctx, palette)` resuelve el color con la paleta activa. Así una explosión en curso cambia de color con la skin.
- **Skins** en `lib/engines/asteroids/skins.ts`: `ASTEROIDS_SKINS: Record<SkinId, AsteroidsSkin>`, donde `AsteroidsSkin = SkinDef<keyof Palette> & { particleGlow: number }`.
- **Motor** (`lib/engines/asteroids/engine.ts`):
  - Se eliminan `readPalette()`, `GLOW` y `PARTICLE_GLOW`.
  - La factory resuelve `ASTEROIDS_SKINS[options.skin]` con `resolveColors` y guarda paleta, `glow` y `particleGlow` en una variable de la instancia.
  - `draw()` pinta el fondo con `palette.background` y usa `glow` / `particleGlow` de la skin activa.
  - `setSkin(id)` vuelve a resolver la skin. Si la fase es `ready` o `paused`, llama a `draw()`.
- **Registro:** `GAME_META.asteroids.hasSkins = true`.
- Grosor de línea, formas, tamaños, fuentes del canvas y parpadeos se mantienen iguales en las 3 skins.

**Fuera de alcance (para futuras specs):**

- Skins de Tetris, Arkanoid y Snake.
- Cambiar formas (nave, asteroides, rombo del power-up) o grosores por skin.
- Efecto de persistencia de fósforo (estelas) en `retro`.
- Scanlines dibujadas en el canvas.
- OVNIs, sonido o cualquier cambio de reglas.
- Cambiar la portada `cover-rocas`.

---

## Paletas

### Colores

Contraste calculado contra el `background` de la propia skin (WCAG, luminancia relativa).

| Clave        | Qué pinta                                               | `clasico` | `neon`                     | `retro`   |
| ------------ | ------------------------------------------------------- | --------- | -------------------------- | --------- |
| `background` | Fondo del canvas (`fillRect` de 800×600 en cada `draw`) | `#000000` | `#000000` (fijo, como hoy) | `#031a09` |
| `ship`       | Contorno de la nave y partículas al morir               | `#ffffff` | `--cyan` / `#00f5ff`       | `#d4ffdc` |
| `flame`      | Llama del propulsor                                     | `#ff8200` | `--yellow` / `#f5ff00`     | `#1f8a3a` |
| `bullet`     | Balas (círculos de radio 2)                             | `#ffe9a8` | `--yellow` / `#f5ff00`     | `#d4ffdc` |
| `asteroid`   | Contorno de los asteroides y sus partículas             | `#bdbdbd` | `--magenta` / `#ff006e`    | `#33cc55` |
| `powerUp`    | Rombo, texto `3x` del power-up e indicador `3x  N.Ns`   | `#00ffff` | `--green` / `#00ff88`      | `#7dff9a` |

### Contraste contra el fondo

| Clave      | `clasico` | `neon` | `retro` |
| ---------- | --------- | ------ | ------- |
| `ship`     | 21:1      | 15,5:1 | 16,6:1  |
| `flame`    | 8,4:1     | 19,2:1 | 4,1:1   |
| `bullet`   | 17,5:1    | 19,2:1 | 16,6:1  |
| `asteroid` | 11,2:1    | 5,5:1  | 8,6:1   |
| `powerUp`  | 16,7:1    | 15,7:1 | 14,4:1  |

Todos los elementos superan el objetivo de 3:1.

### Render

| Ajuste                          | `clasico`      | `neon`               | `retro`             |
| ------------------------------- | -------------- | -------------------- | ------------------- |
| `glow` (`shadowBlur` entidades) | `0`            | `10` (actual `GLOW`) | `4`                 |
| `particleGlow`                  | `0`            | `4` (actual)         | `0`                 |
| `shadowColor`                   | sin efecto     | color de cada grupo  | color de cada grupo |
| Grosor de línea                 | 1,5 / 2 / 1 px | 1,5 / 2 / 1 px       | 1,5 / 2 / 1 px      |
| Scanlines en el canvas          | no             | no                   | no                  |
| Fondo                           | negro puro     | negro puro           | verde muy oscuro    |

El grosor es el actual en las 3 skins: 1,5 px nave, llama y asteroides, 2 px rombo del power-up, 1 px partículas.

### Notas por skin

- **`clasico` (vectores sobre negro):** sale de `game.js`. Nave blanca, power-up `#0ff`, llama `rgba(255, 130, 0, 0.85)` pasada a `#ff8200` opaco y sin glow.
  - En `game.js` los asteroides y las balas también son `#fff`. Aquí se separan para que nave, asteroides y balas no compartan color.
  - Los asteroides van en gris `#bdbdbd`, que imita el menor brillo de las rocas frente a la nave en los monitores vectoriales de la época.
  - Las balas van en blanco cálido `#ffe9a8`: se leen como puntos de alta intensidad y no se confunden con la nave.
  - Las partículas siguen el color de lo que explota (blanco para la nave, gris para las rocas), coherente con las partículas blancas de `game.js`.
- **`neon` (estética de la plataforma):** es exactamente el look actual, ahora registrado y con fondo explícito.
  - Llama y balas comparten `--yellow` como hoy. La llama no es un elemento jugable y se mantiene para no cambiar el look neón existente.
- **`retro` (monitor de fósforo verde P1):** 5 tonos de un solo matiz.
  - Nave y balas comparten el tono más brillante `#d4ffdc`. Se distinguen por forma: contorno triangular de 32 px frente a puntos de 4 px.
  - Asteroides en tono medio `#33cc55` y power-up en `#7dff9a`, más brillante que las rocas, con forma de rombo y texto `3x`.
  - La llama va en el tono más apagado `#1f8a3a` para que no tape la nave.
  - Glow suave de 4 en entidades y sin glow en partículas.
  - Sin scanlines en el canvas: `.crt-screen::after` ya las pone sobre todas las skins y duplicarlas oscurece las líneas de 1,5 px.

### Assets

Asteroids no usa sprites ni archivos en `public/games/asteroids/`. Todo se dibuja con vectores, así que las 3 skins solo cambian colores. No hace falta ningún asset nuevo.

---

## Plan de implementación

Requiere SPEC 13 implementada (`SkinId`, `SkinDef`, `resolveColors`, `setSkin` en el contrato, `hasSkins` en `GameMeta` y `SkinPicker`).

1. **Paleta y partículas.** En `lib/engines/asteroids/entities.ts`, añadir `background` a `Palette`, cambiar `Particle` para guardar `kind` y resolver el color en `draw(ctx, palette)`, y actualizar el comentario de cabecera (los colores vienen de la skin activa). Ajustar las llamadas a `explode` en `engine.ts` para pasar `"ship"` / `"asteroid"`. Verificar: `npm run build` pasa y el juego se ve igual.
2. **Skins.** Crear `lib/engines/asteroids/skins.ts` con `AsteroidsSkin` y `ASTEROIDS_SKINS` con los valores de las tablas de esta spec. `neon` usa `{ cssVar, fallback }` para `ship`, `flame`, `bullet`, `asteroid` y `powerUp`. Verificar: `npm run build` pasa.
3. **Motor.** En `engine.ts`, quitar `readPalette`, `GLOW` y `PARTICLE_GLOW`, resolver la skin de `options.skin` y usar `background`, `glow` y `particleGlow` en `draw()`. Verificar: con `av:skin:v1:asteroids = "neon"` en `localStorage`, el juego se ve igual que antes de esta spec.
4. **`setSkin`.** Sustituir el no-op por la versión real: resuelve la skin nueva y llama a `draw()` en `ready` y `paused`. Verificar: llamando a `setSkin("retro")` desde el player en pausa, el canvas cambia al momento.
5. **Activar.** Poner `GAME_META.asteroids.hasSkins = true`. Verificar: `/games/asteroids/play` muestra el selector `MODO · CLÁSICO · NEÓN · RETRO` en `.crt-bottom` y cambia la skin en caliente.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores ni warnings de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] `ASTEROIDS_SKINS` está tipado `Record<SkinId, AsteroidsSkin>` y cada skin define las 6 claves de `Palette`, `glow` y `particleGlow`.
- [ ] `engine.ts` y `entities.ts` no contienen ningún color literal (`"#000"`, hex ni `rgba`) fuera de `skins.ts`.
- [ ] `clasico` es la skin por defecto: con `localStorage` vacío, `/games/asteroids/play` muestra nave blanca, asteroides grises, balas blanco cálido, power-up cian y fondo negro, sin glow.
- [ ] Con `neon`, el canvas es idéntico al de antes de esta spec (nave cian, asteroides magenta, balas y llama amarillas, power-up verde, glow 10 y 4).
- [ ] Con `retro`, todo el canvas usa solo los 5 tonos verdes de la tabla, con el fondo `#031a09`.
- [ ] El selector muestra `CLÁSICO`, `NEÓN` y `RETRO`, y el botón activo tiene `aria-pressed="true"`.
- [ ] Cambiar de skin durante `playing` no reinicia la partida: puntuación, vidas, nivel y posición de los asteroides se mantienen.
- [ ] Cambiar de skin en `paused` redibuja el canvas al momento y la partida sigue en pausa.
- [ ] Cambiar de skin en `ready` redibuja la pantalla inicial y la partida no empieza.
- [ ] Una explosión en curso cambia de color al cambiar de skin.
- [ ] Después de pulsar un botón del selector con el ratón, pulsar Espacio dispara y no cambia la skin.
- [ ] Recargar `/games/asteroids/play` conserva la última skin elegida (`av:skin:v1:asteroids`).
- [ ] JUGAR DE NUEVO mantiene la skin elegida.
- [ ] La puntuación y la jugabilidad no cambian entre skins: los asteroides valen 20 / 50 / 100, el power-up dura 5 s, y radios, velocidades y colisiones son los mismos en las 3 skins.
- [ ] Una partida con cualquier skin se guarda en `scores` igual que hoy y `saveScore` sigue validando con `scoreStep = 10`.
- [ ] El HUD React, los overlays de la CRT y el modal de fin se ven igual en las 3 skins.
- [ ] La consola no muestra errores ni avisos de hidratación en `/games/asteroids/play`.
- [ ] Tetris, Arkanoid y Snake no muestran selector y se ven igual que antes.

---

## Decisiones

- **Sí:** `background` como clave de la paleta. Era el único color fijo del canvas (`"#000"`) y `retro` necesita su propio fondo.
- **Sí:** una sola clave `powerUp` para el rombo, su texto y el indicador `3x  N.Ns`. Son el mismo concepto y separarlos añade claves sin mejorar la lectura.
- **No:** claves propias para partículas. Usan el color de lo que explota en las 3 skins, como hoy y como el original.
- **Sí:** partículas por rol (`kind`) en vez de color guardado. Con un cambio de skin en pausa, una explosión a medias seguiría con la paleta anterior.
- **Sí:** `clasico` basado en `game.js` (vectores blancos, power-up cian, llama naranja, sin glow). Es el original que se portó y coincide con el look vectorial del arcade.
- **Sí:** asteroides gris `#bdbdbd` y balas blanco cálido `#ffe9a8` en `clasico`, aunque `game.js` los pinta `#fff`. Nave, rocas y balas no deben compartir color, y la jerarquía de brillo imita la del monitor vectorial.
- **No:** `clasico` todo en blanco. Rompería la regla de que roles distintos no comparten color fuera de `retro`.
- **Sí:** llama `#ff8200` opaca. Es el `rgba(255, 130, 0, 0.85)` de `game.js` sin la transparencia, que sobre negro solo la oscurecía.
- **Sí:** `neon` igual al render actual, incluido el fondo `#000000` en vez de `--bg`. Quien elija NEÓN ve exactamente lo de hoy.
- **Sí:** `retro` en fósforo verde monocromo. Asteroids son líneas finas sobre negro, el caso típico de un monitor de fósforo, y el verde se distingue del blanco de `clasico`.
- **No:** `retro` ámbar. Funciona, pero se acerca al naranja de la llama de `clasico` y las dos skins se parecerían más.
- **No:** `retro` de 4 tonos tipo handheld con fondo claro. Las líneas de 1,5 px sobre fondo claro pierden legibilidad y se pierde la sensación de espacio.
- **Sí:** nave y balas comparten tono en `retro`. Lo permite la regla de `retro` y se distinguen por forma y tamaño.
- **Sí:** glow 4 en `retro` y 0 en `clasico`. El fósforo tiene un halo suave; `game.js` no tenía glow.
- **No:** scanlines en el canvas. La CRT ya aplica `.crt-screen::after` a todas las skins.
- **No:** estelas de fósforo (fondo con alpha). Cambiaría lo que se ve en `ready` y `paused` al redibujar y puede confundir la posición real de los asteroides.
- **No:** grosores distintos por skin. Mantiene la misma lectura de tamaños en las 3 skins y no hay riesgo de que parezca otra hitbox.
- **Sí:** `clasico` por defecto. Cambia lo que ve hoy el jugador (neón) a vectores blancos; NEÓN sigue a un clic y se recuerda.

---

## Riesgos

| Riesgo                                                                            | Mitigación                                                                                                           |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Los jugadores actuales esperan el look neón y ven blanco y negro                  | El selector está a la vista en la CRT y la elección se guarda. Criterio: `neon` es idéntico al render actual.        |
| En `clasico`, nave blanca y asteroides grises se confunden en movimiento          | Contraste nave / asteroide de 1,8:1 además de la forma distinta. Si no basta, se baja el gris sin tocar la nave.     |
| En `retro`, nave y balas del mismo tono                                           | Forma y tamaño muy distintos (triángulo de 32 px frente a punto de 4 px).                                            |
| El glow del grupo anterior se queda en `shadowColor` con `glow = 0`               | Con `shadowBlur = 0` el `shadowColor` no tiene efecto. `draw()` fija `shadowBlur` al principio de cada grupo.        |
| `setSkin` en `ready` o `paused` no se ve porque el bucle no pinta                 | `setSkin` llama a `draw()` en esas fases. Criterios en `ready` y `paused`.                                           |
| `retro` con el fondo `#031a09` hace que la CRT parezca encendida antes de empezar | Es el efecto buscado de monitor de fósforo. El overlay `ready` sigue tapando el canvas igual que en las otras skins. |

---

## Lo que **no** entra en esta spec

- Skins de Tetris, Arkanoid y Snake.
- Formas o grosores distintos por skin.
- Estelas de fósforo o scanlines en el canvas.
- Cambios de reglas, OVNIs o sonido.
- Portada nueva.

Cada uno de estos puntos, si llega, va en su propia spec.

> Para implementarla, se mueve a `specs/NN-<slug>.md` (siguiente número libre), pasa a `Aprobado` y se ejecuta `/spec-impl NN-<slug>`. La de plataforma va primero.

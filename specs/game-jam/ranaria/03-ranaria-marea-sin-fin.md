# GAME JAM ranaria · 03 — RANARIA jugable (marea sin fin)

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06, SPEC 10
> **Fecha:** 2026-10-16
> **Tema:** Ranaria — un juego estilo Frogger para Arcade Vault
> **Objetivo:** Crear un Frogger nuevo como motor TypeScript jugable en `/games/ranaria/play`, con sus puntuaciones guardadas en `scores` y visibles en el leaderboard, la biblioteca y el Salón de la Fama.

---

## Por qué existe esta spec

Hoy el catálogo tiene la fila mock `ranaria` (RANARIA, ARCADE, `cover-rana`, `green`, dificultad 3, `sort_order = 7`), que describe un Frogger pero no tiene motor y no aparece en la biblioteca (SPEC 08).
No hay `game.js` ni assets de referencia en `references/`, así que esta spec fija todas las reglas: generación del mundo, carriles, velocidades, puntuación, niveles y condición de fin.
Esta variante es la más distinta: el cruce no acaba en una pantalla, sino que la rana sube por un mundo generado sin fin de carreteras, ríos y franjas de hierba.
La puntuación mide la distancia recorrida, no hay vidas (muerte súbita, como Snake) y cada 25 filas hay una orilla de nenúfares que hace de meta de control y sube el nivel.
El temporizador por vida, que no cabe en `HudStat`, se convierte en una marea de neón que sube desde abajo. Se dibuja en el canvas como parte del mundo y no hace falta tocar la plataforma.
La plataforma ya es genérica desde SPEC 10 (`GAME_META`, `scoreStep` por juego, HUD según `hud`).
Esta spec solo crea el motor, actualiza los textos de la fila y lo activa con `isPlayable`; el resto (`saveScore`, leaderboard, estadísticas, Salón de la Fama) se activa sin código nuevo.

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
  - **Marea (el temporizador):** una línea `tide` (altura en filas, decimal) que sube sin parar.
    - Empieza en `−1` (fuera de pantalla).
    - Sube a `TIDE_BASE = 0.35` filas/s × `mul(nivel)`, con tope de 0,7 filas/s desde el nivel 11.
    - Nunca queda más de `TIDE_CUSHION = 3.75` filas por debajo de la fila máxima: `tide = max(tide, filaMax − 3.75)`. Correr no da más ventaja que ese colchón.
    - Como el colchón (3,75) es menor que el adelanto de la cámara (4), la cresta siempre asoma al menos 10 px por el borde inferior.
    - Si la marea cubre el centro de la rana (`tide ≥ filaRana + 0.5`, con la fila interpolada durante el salto), la rana muere.
    - Quieta en la salida, la marea alcanza a la rana en 10 s.
  - **Sin vidas:** cualquier muerte (vehículo, agua, salir del campo, seto, marea) termina la partida tras una animación de 700 ms (anillo que se expande: `--magenta` en carretera y seto, `--cyan` en el agua y la marea). La entrada se ignora mientras dura.
  - **Niveles:** `nivel = 1 + orillas superadas`. El nivel acelera la marea al instante y los carriles que se generan a partir de ese momento.
  - `dt` del rAF limitado a 50 ms.
- **Estética:** neón vectorial, sin assets.
  - Fondo `#000`.
  - Hierba en `--green` con alpha 0,10. Carretera `#000` con líneas discontinuas de carril en `--ink` con alpha 0,15. Río con relleno `#001a2e`.
  - Orilla: seto en `--green` con alpha 0,25 y nenúfares con contorno circular `--green`. Al posarse, el nenúfar se rellena de `--green` durante 400 ms.
  - Rana: cuerpo `--green`, ojos `--ink`, patas en trazo `--green`. Al saltar se escala a 1,15 a mitad del salto.
  - Troncos: contorno naranja neón `#ff9f1c` con relleno al 25 %. Tortugas: círculos `#ff3b3b` (el mismo rojo que Tetris y Arkanoid). Hundiéndose, alpha 0,5. Sumergidas, solo el contorno con alpha 0,15.
  - Coches en `--cyan`, `--yellow` o `--magenta` (al azar al generar el carril). Camiones `#ff9f1c`.
  - **Marea:** banda desde la línea `tide` hasta el borde inferior, con relleno `--cyan` alpha 0,25. La cresta es una onda de 4 px de amplitud y 80 px de longitud que se desplaza, en trazo `--cyan` de 3 px con glow, y un segundo trazo `--magenta` con alpha 0,5 desfasado media onda.
  - Los objetos se recortan (`clip`) al campo `x = 20–780`.
  - Glow con `shadowBlur` por grupo (carriles, rana, marea). Colores de `:root` con fallback a sus hex.
  - El canvas no dibuja HUD: puntuación y nivel salen por `onStats`. No hay barra ni número de tiempo: la marea es el tiempo.
  - El canvas no dibuja pausa ni game over.
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

- **HUD React:** Jugador, Puntuación y Nivel (sin Vidas ni Líneas), como Snake. **Modal de fin:** PUNTUACIÓN FINAL y NIVEL.
- **Catálogo:** se reutiliza la fila `ranaria` y se actualizan `short`, `long` y `difficulty = 4`, mediante una migración. Se mantienen `title = RANARIA`, `cat = ARCADE`, `cover = cover-rana`, `color = green` y `sort_order = 7`.
- **Registro:** `ranaria` en `PLAYABLE_GAME_IDS`, `ENGINES` y `GAME_META` (`scoreStep: 10`, `initialLives: null`, `hud: ["level"]`).
- Sin CSS nuevo: `.cover-rana`, `.hud-stat.level` y `.final-level` ya existen.

**Fuera de alcance (para futuras specs):**

- Sonido.
- Controles táctiles y jugabilidad en móvil.
- Mejoras sobre esta variante: semilla diaria compartida, monedas o moscas, power-ups, biomas nuevos (vías de tren, hielo), cocodrilos, vidas o checkpoints con respawn.
- Mostrar la distancia en filas en el HUD o en el leaderboard (la puntuación ya la refleja).
- Ampliar `HudStat` con una celda de tiempo.
- Sprites o assets de imagen.
- Rediseño de la portada `.cover-rana`.
- WASD o teclas configurables.
- Antitrampas real.

---

## Modelo de datos

### Migración — `supabase/migrations/20261016120000_update_ranaria.sql`

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
  hud: ["level"],
  controls: [
    { keys: ["←", "↑", "→", "↓"], label: "Saltar" },
    { keys: ["P", "ESC"], label: "Pausa" },
  ],
},
```

Las etiquetas de `controls` no se repiten porque `EnginePlayer` las usa como `key`.

### Archivos del motor

- `lib/engines/ranaria/generator.ts`: tipos `RowKind = "grass" | "road" | "river" | "shore"`, `Row = { index: number; kind: RowKind; lane?: Lane }` y `Lane = { kind: "car" | "truck" | "log" | "turtle"; len: number; gap: number; count: number; dir: 1 | -1; speed: number; offset: number; divers: number[]; color: string }`, y la función pura `createRowGenerator(rng)` que devuelve `next(level): Row` con las reglas de tramos, orillas y recortes. Sin estado global.
- `lib/engines/ranaria/entities.ts`: constantes (`W`, `H`, `CELL = 40`, `COLS = 19`, `FIELD_X = 20`, `VISIBLE_ROWS = 15`, `START_ROW = 2`, `START_COL = 9`, `SHORE_EVERY = 25`, `HOME_COLS = [1, 5, 9, 13, 17]`, `HOME_TOLERANCE = 20`, `HOP_MS = 120`, `CAM_SPEED = 6`, `CAM_LEAD = 4`, `TIDE_START = -1`, `TIDE_BASE = 0.35`, `TIDE_CUSHION = 3.75`, `DEATH_MS = 700`, `DIVE_CYCLE = [2.5, 0.5, 1]`, `SPEED_STEP = 0.1`, `MAX_SPEED_MUL = 2`, puntos), tipos (`Dir`, `Frog`) y helpers puros (`speedMul`, `rowToY`, `laneObjects`, `isSupported`, `hitsVehicle`, `homeAt`, `drawRow`, `drawFrog`, `drawTide`, `drawDeath`). Sin globals.
- `lib/engines/ranaria/engine.ts`: `createRanariaGame: GameFactory`. Contiene el estado (`rows`, `generator`, `frog`, `pendingHop`, `maxRow`, `camBottom`, `tide`, `score`, `level`, `deathTimer`, `diveClock`, `waveClock`), el input, el bucle rAF, la generación y descarte de filas, las colisiones y el render.

### Puntuación

| Acción                                   | Puntos |
| ---------------------------------------- | ------ |
| Saltar a una fila más alta que la máxima | 10     |
| Posarse en un nenúfar de una orilla      | 100    |

`scoreStep = 10`. Cada 25 filas valen 250 + 100 = 350 puntos, así que harían falta unas 714.000 filas para llegar al máximo.
El motor limita la puntuación a 10.000.000.

---

## Plan de implementación

1. **Migración del catálogo.** Crear y aplicar `20261016120000_update_ranaria.sql` con `npx supabase db push`. Verificar con MCP `execute_sql` que `ranaria` tiene el `short` y el `long` nuevos y `difficulty = 4`, y conserva `title`, `cat`, `cover` y `sort_order = 7`.
2. **Generador.** Leer `.claude/skills/add-game/porting-guide.md`. Crear `lib/engines/ranaria/generator.ts`. Verificar con un script puntual que no se commitea (1.000 filas con `Math.random`): las filas 0–3 son hierba, las múltiplo de 25 son orilla con hierba antes y después, ningún tramo pasa de 5 carriles y todos los huecos de río están entre 2 y 3 celdas.
3. **Entidades.** Crear `lib/engines/ranaria/entities.ts` con las constantes y helpers. Verificar: `npm run build` pasa.
4. **Motor.** Crear `lib/engines/ranaria/engine.ts` con `createRanariaGame`:
   - Fases, pausa por `blur` / `visibilitychange`, `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar y reiniciar.
   - Teclado por `e.code` en `window`, ignorando `e.repeat`. `preventDefault` en flechas y Espacio solo en `ready`, `playing` y `paused`. Salto pendiente descartado al pausar, reanudar y reiniciar.
   - Generación y descarte de filas, cámara, salto, arrastre en el río, buceo, colisiones, orillas, marea y muerte.
   - `onStats` con `score` y `level` solo cuando cambian.
   - `destroy()` cancela el rAF y quita todos los listeners.
5. **Registro.** Añadir `ranaria` a `PLAYABLE_GAME_IDS`, `ENGINES` (`createRanariaGame`) y `GAME_META`. Verificar: `/games/ranaria/play` monta el motor con el overlay de inicio y los controles de Ranaria, en lugar del `GamePlayer` mock.
6. **Cierre.** Partida como invitado y otra con sesión. Comprobación con MCP. Recorrer los criterios de aceptación. `npm run lint` y `npm run build`.

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
- [ ] Emulando un dispositivo táctil, se muestra "REQUIERE TECLADO" y no arranca el motor.
- [ ] `get_advisors` (security y performance) no muestra avisos nuevos.
- [ ] Asteroids, Tetris, Arkanoid y Snake siguen igual (controles, HUD y guardado).

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
- **Sí:** id `ranaria` y título `RANARIA`. Es el tema recibido, ya está en el catálogo y no usa la marca Frogger.
- **Sí:** mundo vertical generado sin fin. Es la variante más distinta: otra progresión (distancia), otra condición de fin (muerte súbita) y otro reto (leer carriles nuevos en cada partida).
- **Sí:** orillas de nenúfares cada 25 filas. Mantienen las casillas de meta del tema como puntos de control que suben el nivel y dan respiro.
- **Sí:** el temporizador se convierte en una marea dibujada en el canvas. Es parte del mundo (como las rocas de Asteroids), no una estadística del HUD, y su distancia a la rana ya dice cuánto tiempo queda.
- **No:** ampliar `HudStat` con una celda de tiempo. La marea no tiene un número de segundos fijo: depende de lo lejos que esté la rana.
- **No:** barra de tiempo en el canvas. Duplicaría la marea con dos relojes distintos.
- **Sí:** colchón de 3,75 filas, menor que el adelanto de cámara de 4. Sin colchón, correr acumularía ventaja infinita y la marea dejaría de presionar; con este valor, su cresta siempre se ve.
- **Sí:** la orilla baja la marea al colchón máximo. Premia llegar a la meta sin dar tiempo acumulable.
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

---

## Lo que **no** entra en esta spec

- Sonido.
- Controles táctiles.
- Semilla diaria, monedas, moscas, power-ups, biomas nuevos, cocodrilos, vidas o respawn.
- Distancia en filas en el HUD o en el leaderboard.
- Celda de tiempo en el HUD.
- Sprites o assets de imagen.
- Rediseño de la portada.
- WASD o teclas configurables.
- Antitrampas real.

Cada uno de estos puntos, si llega, va en su propia spec.

> Si se elige esta variante, se mueve a `specs/13-ranaria-jugable.md` (siguiente número libre), se renumera la cabecera a `SPEC 13`, pasa a `Aprobado` y se implementa con `/spec-impl`.

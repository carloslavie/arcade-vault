# GAME JAM ranaria · 01 — RANARIA jugable (clásica)

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06, SPEC 10
> **Fecha:** 2026-10-16
> **Tema:** Ranaria — un juego estilo Frogger para Arcade Vault
> **Objetivo:** Crear un Frogger nuevo como motor TypeScript jugable en `/games/ranaria/play`, con sus puntuaciones guardadas en `scores` y visibles en el leaderboard, la biblioteca y el Salón de la Fama.

---

## Por qué existe esta spec

Hoy el catálogo tiene la fila mock `ranaria` (RANARIA, ARCADE, `cover-rana`, `green`, dificultad 3, `sort_order = 7`), que describe un Frogger pero no tiene motor y no aparece en la biblioteca (SPEC 08).
No hay `game.js` ni assets de referencia en `references/`, así que esta spec fija todas las reglas: tablero, carriles, velocidades, puntuación, niveles y condición de fin.
Es la primera mecánica de cruce y timing de la plataforma: carriles de tráfico, troncos y tortugas en el río y cinco nenúfares de meta.
Esta variante es la más fiel al arcade y la más barata: cinco metas por nivel, 3 vidas y un temporizador de 30 s por rana.
El temporizador no cabe en `HudStat` (`lives` / `lines` / `level`), y esta variante lo dibuja dentro del canvas como la barra TIEMPO del original, sin tocar la plataforma.
La plataforma ya es genérica desde SPEC 10 (`GAME_META`, `scoreStep` por juego, HUD según `hud`).
Esta spec solo crea el motor y lo activa con `isPlayable`; el resto (`saveScore`, leaderboard, estadísticas, Salón de la Fama) se activa sin código nuevo.

---

## Alcance

**Dentro:**

- **Motor de Ranaria en TypeScript**, sin React, en `lib/engines/ranaria/`:
  - Canvas lógico `W = 800`, `H = 600`, ya 4:3: ocupa toda la CRT sin bandas. Buffer × `devicePixelRatio`.
  - Rejilla de `CELL = 40` px. El campo tiene `COLS = 19` columnas, de `x = 20` a `x = 780`. Los 20 px de cada lado son seto decorativo.
  - Banda superior `y = 0–40`: seto decorativo.
  - 13 filas de juego desde `TOP = 40`; la fila `r` ocupa `y = 40 + 40·r`:

    | Fila | Tipo                                                        |
    | ---- | ----------------------------------------------------------- |
    | 0    | Meta: seto con 5 nenúfares en las columnas 1, 5, 9, 13 y 17 |
    | 1–5  | Río                                                         |
    | 6    | Mediana (segura)                                            |
    | 7–11 | Carretera                                                   |
    | 12   | Acera de salida (segura)                                    |

  - Banda inferior `y = 560–600`: barra de tiempo (único indicador del canvas).
  - **Carriles del nivel 1** (`lanes.ts`). Cada carril es un patrón cíclico de `count` objetos de `len` celdas separados por `gap` celdas. El patrón mide siempre al menos 19 + `len` celdas, así que un objeto nunca aparece de golpe dentro del campo:

    | Fila | Objeto                | len | count | gap | Sentido | Velocidad |
    | ---- | --------------------- | --- | ----- | --- | ------- | --------- |
    | 1    | Tronco                | 4   | 3     | 4   | →       | 60 px/s   |
    | 2    | Tortugas (buceadoras) | 2   | 5     | 3   | ←       | 70 px/s   |
    | 3    | Tronco largo          | 6   | 3     | 3   | →       | 100 px/s  |
    | 4    | Tronco corto          | 3   | 4     | 3   | →       | 45 px/s   |
    | 5    | Tortugas              | 3   | 4     | 3   | ←       | 55 px/s   |
    | 7    | Camión                | 2   | 3     | 5   | ←       | 50 px/s   |
    | 8    | Coche rápido          | 1   | 2     | 10  | →       | 150 px/s  |
    | 9    | Coche                 | 1   | 4     | 4   | ←       | 70 px/s   |
    | 10   | Tractor               | 1   | 3     | 6   | →       | 45 px/s   |
    | 11   | Coche                 | 1   | 4     | 4   | ←       | 60 px/s   |

  - **Tortugas buceadoras:** en la fila 2 bucean los grupos 2.º y 4.º; en la fila 5, el 3.º. Ciclo de 4 s: 2,5 s a flote, 0,5 s hundiéndose (sostienen a la rana) y 1 s sumergidas (no sostienen). El ciclo no se acelera con el nivel.
  - **Rana:** empieza en la fila 12, columna 9 (centro `x = 400`), mirando arriba.
    - Cada pulsación de flecha es un salto de una celda que dura `HOP_MS = 120` ms. Se dibuja interpolado y mirando en la dirección del salto.
    - `e.repeat` se ignora: mantener una flecha pulsada salta una sola vez.
    - Se guarda como máximo 1 salto pendiente pulsado durante otro salto.
    - La posición `x` es continua. Al aterrizar en la mediana, la carretera o la acera, `x` se ajusta al centro de columna más cercano.
    - Un salto lateral se ignora si el centro de destino queda fuera de `[40, 760]`. Un salto hacia abajo desde la fila 12 se ignora.
    - Caja de colisión de 28×28 centrada en la rana.
  - **Río:** al aterrizar en una fila de río, la rana necesita que su centro quede sobre un tronco o un grupo de tortugas a flote. Si no, se ahoga.
    - Sobre una plataforma, la rana se desplaza con ella (`velocidad × dt`). Durante un salto no se desplaza.
    - Si las tortugas bajo la rana se sumergen, se ahoga.
    - Si la plataforma la saca del campo (centro fuera de `[20, 780]`), muere.
  - **Carretera:** si la caja de la rana toca la caja de un vehículo (recortada 4 px por cada lado en horizontal), muere. Se comprueba cada frame con la posición interpolada.
  - **Meta:** al saltar a la fila 0, la rana entra en un nenúfar libre si su centro está a menos de `HOME_TOLERANCE = 20` px del centro de ese nenúfar (`x = 80, 240, 400, 560, 720`). En el seto o en un nenúfar ocupado, muere.
    - Al entrar, la rana se coloca en el centro del nenúfar, que queda ocupado, y sale una rana nueva en la salida con el tiempo lleno.
  - **Temporizador:** `TIME_LIMIT = 30` s por rana. Se reinicia al llegar a un nenúfar y al perder una vida. Se congela durante la animación de muerte y la transición de nivel. Si llega a 0, la rana muere.
  - **Vidas:** 3. Cualquier muerte (vehículo, agua, salir del campo, seto, nenúfar ocupado, tiempo agotado) resta una vida.
    - La muerte se anima durante 700 ms (anillo que se expande: `--magenta` en carretera, `--cyan` en el río) y la entrada se ignora mientras dura.
    - Después, si quedan vidas, sale una rana nueva en la salida. Si no, la partida termina.
  - **Niveles:** al ocupar los 5 nenúfares se suma el bonus de nivel y hay una transición de 1 s con las 5 ranas visibles. Después se vacían los nenúfares, sube el nivel, la rana vuelve a la salida y los carriles vuelven a sus posiciones iniciales.
    - Todas las velocidades de carril se multiplican por `min(2.2, 1 + 0.12·(nivel − 1))`. El tope se alcanza en el nivel 11.
    - El límite de tiempo no cambia con el nivel.
  - `dt` del rAF limitado a 50 ms.
- **Estética:** neón vectorial, sin assets.
  - Fondo `#000`.
  - Río con relleno `#001a2e`. Carretera `#000` con líneas discontinuas de carril en `--ink` con alpha 0,15.
  - Mediana y acera de salida en `--magenta` con alpha 0,15. Seto en `--green` con alpha 0,25.
  - Nenúfares: contorno circular `--green`. Rana en un nenúfar ocupado: la misma rana `--green`.
  - Rana: cuerpo `--green`, ojos `--ink`, patas en trazo `--green`. Al saltar se escala a 1,15 a mitad del salto.
  - Troncos: contorno naranja neón `#ff9f1c` con relleno al 25 %. Tortugas: círculos `#ff3b3b` (el mismo rojo que Tetris y Arkanoid). Hundiéndose, alpha 0,5. Sumergidas, solo el contorno con alpha 0,15.
  - Vehículos: camión `#ff9f1c`, coche rápido `--magenta`, coches de las filas 9 y 11 `--cyan` y `--yellow`, tractor `#ff3b3b`.
  - Los objetos se recortan (`clip`) al campo `x = 20–780`.
  - **Barra de tiempo** en la banda inferior: la etiqueta `TIEMPO` en `--pixel` 12 px `--ink` en `x = 20`, y una barra de 16 px de alto de `x = 140` a `x = 780` que se encoge de forma continua. Color `--green` por encima del 50 %, `--yellow` entre el 20 % y el 50 %, y `--magenta` por debajo del 20 %.
  - Glow con `shadowBlur` por grupo (carriles, rana, barra). Colores de `:root` con fallback a sus hex.
  - El canvas no dibuja HUD: puntuación, vidas y nivel salen por `onStats`.
  - El canvas no dibuja pausa ni game over.
- **Fases** `ready → playing ⇄ paused → over`, igual que SPEC 05: Espacio empieza, y P/Esc o la pérdida de foco pausan; la partida nunca se reanuda sola.
  - En `ready` se ven los carriles quietos en sus posiciones iniciales, la rana en la salida y la barra llena.
  - La animación de muerte y la transición de nivel cuentan como `playing`.
  - Perder la última vida o pulsar FIN pasan a `over`.
- **Controles:**

  | Entrada               | Acción                    |
  | --------------------- | ------------------------- |
  | `←` / `↑` / `→` / `↓` | Saltar                    |
  | `P` / `Esc`           | Pausa                     |
  | `Espacio`             | Empezar (solo en `ready`) |
  - Teclas por `e.code` (`ArrowLeft`, `ArrowUp`, `ArrowRight`, `ArrowDown`, `KeyP`, `Escape`, `Space`).
  - El salto pendiente se descarta al pausar, reanudar y reiniciar.
  - Sin ratón ni WASD.

- **HUD React:** Jugador, Puntuación, Vidas y Nivel (sin Líneas), como Asteroids y Arkanoid. **Modal de fin:** PUNTUACIÓN FINAL y NIVEL.
- **Catálogo:** se reutiliza la fila `ranaria` tal cual. Su id coincide con el `game-id` y sus textos ya describen esta variante (`short`: "Cruza la autopista de pixeles."; `long`: "Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo."). Se mantienen `cat = ARCADE`, `cover = cover-rana`, `color = green`, `difficulty = 3` y `sort_order = 7`.
- **Registro:** `ranaria` en `PLAYABLE_GAME_IDS`, `ENGINES` y `GAME_META` (`scoreStep: 10`, `initialLives: 3`, `hud: ["lives", "level"]`).
- Sin CSS nuevo: `.cover-rana`, `.hud-stat.lives`, `.hud-stat.level` y `.final-level` ya existen.

**Fuera de alcance (para futuras specs):**

- Sonido.
- Controles táctiles y jugabilidad en móvil.
- Mejoras sobre el Frogger clásico: moscas y cocodrilos en los nenúfares, serpientes en la mediana, nutrias, rana acompañante, vida extra por puntuación, carriles que cambian de patrón por nivel.
- Temporizador en el HUD React (ampliar `HudStat`).
- Sprites o assets de imagen.
- Rediseño de la portada `.cover-rana`.
- WASD o teclas configurables.
- Antitrampas real.

---

## Modelo de datos

### Catálogo — sin migración

La fila `ranaria` ya existe desde `20261006163947_create_games.sql` (con `difficulty = 3` desde `20261007120000_add_games_difficulty.sql`).
Su id es el `game-id` de este juego, así que no hay renombrado.
Sus textos ya describen esta variante, así que no hay `update`.
No cambia el esquema: no hace falta `npm run db:types`.

### Metadatos (`lib/engines/meta.ts`, entrada nueva)

```ts
ranaria: {
  scoreStep: 10,
  initialLives: 3,
  hud: ["lives", "level"],
  controls: [
    { keys: ["←", "↑", "→", "↓"], label: "Saltar" },
    { keys: ["P", "ESC"], label: "Pausa" },
  ],
},
```

Las etiquetas de `controls` no se repiten porque `EnginePlayer` las usa como `key`.

### Archivos del motor

- `lib/engines/ranaria/lanes.ts`: tipo `Lane = { row: number; kind: "log" | "turtle" | "truck" | "car" | "fast" | "tractor"; len: number; count: number; gap: number; dir: 1 | -1; speed: number; divers: number[]; color: string }` y `LANES: Lane[]` con los 10 carriles del nivel 1. `divers` son los índices de grupos de tortugas que bucean. Solo datos, tipado.
- `lib/engines/ranaria/entities.ts`: constantes (`W`, `H`, `CELL = 40`, `COLS = 19`, `FIELD_X = 20`, `TOP = 40`, `START_ROW = 12`, `START_COL = 9`, `HOME_COLS = [1, 5, 9, 13, 17]`, `HOME_TOLERANCE = 20`, `HOP_MS = 120`, `TIME_LIMIT = 30`, `DEATH_MS = 700`, `LEVEL_CLEAR_MS = 1000`, `DIVE_CYCLE = [2.5, 0.5, 1]`, `SPEED_STEP = 0.12`, `MAX_SPEED_MUL = 2.2`, puntos), tipos (`Dir`, `Frog`, `LaneState`) y helpers puros (`speedMul`, `laneObjects`, `isSupported`, `hitsVehicle`, `homeAt`, `drawBoard`, `drawLanes`, `drawFrog`, `drawHomes`, `drawTimeBar`, `drawDeath`). Sin globals.
- `lib/engines/ranaria/engine.ts`: `createRanariaGame: GameFactory`. Contiene el estado (`frog`, `pendingHop`, `lanes` con su desplazamiento, `homes: boolean[]`, `maxRowThisFrog`, `timeLeft`, `score`, `lives`, `level`, `deathTimer`, `clearTimer`, `diveClock`), el input, el bucle rAF, las colisiones y el render.

### Puntuación

| Acción                                                | Puntos                          |
| ----------------------------------------------------- | ------------------------------- |
| Saltar a una fila más alta que la máxima de esta rana | 10                              |
| Entrar en un nenúfar libre                            | 50                              |
| Bonus de tiempo al entrar en un nenúfar               | 10 × segundos enteros restantes |
| Ocupar los 5 nenúfares                                | 1.000                           |

`scoreStep = 10`. La fila máxima se reinicia con cada rana nueva (tras un nenúfar o una muerte).
Una rana suma como mucho 120 por filas, 50 por el nenúfar y 290 de bonus (siempre pasa al menos 1 s), así que un nivel da menos de 5 × 460 + 1.000 = 3.300 puntos.
Harían falta unos 3.000 niveles para llegar al máximo. El motor limita la puntuación a 10.000.000.

---

## Plan de implementación

1. **Verificación del catálogo.** Comprobar con MCP `execute_sql` que `games` tiene `ranaria` / `RANARIA` con `cat = ARCADE`, `cover = cover-rana`, `difficulty = 3` y `sort_order = 7`. No se crea migración.
2. **Carriles y entidades.** Leer `.claude/skills/add-game/porting-guide.md`. Crear `lib/engines/ranaria/lanes.ts` y `lib/engines/ranaria/entities.ts` con las constantes y helpers. Verificar: `npm run build` pasa.
3. **Motor.** Crear `lib/engines/ranaria/engine.ts` con `createRanariaGame`:
   - Fases, pausa por `blur` / `visibilitychange`, `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar y reiniciar.
   - Teclado por `e.code` en `window`, ignorando `e.repeat`. `preventDefault` en flechas y Espacio solo en `ready`, `playing` y `paused`. Salto pendiente descartado al pausar, reanudar y reiniciar.
   - Salto, arrastre en el río, buceo de tortugas, colisiones, metas, temporizador, muerte y transición de nivel.
   - Render del tablero, carriles, nenúfares, rana y barra de tiempo.
   - `onStats` con `score`, `lives` y `level` solo cuando cambian.
   - `destroy()` cancela el rAF y quita todos los listeners.
4. **Registro.** Añadir `ranaria` a `PLAYABLE_GAME_IDS`, `ENGINES` (`createRanariaGame`) y `GAME_META`. Verificar: `/games/ranaria/play` monta el motor con el overlay de inicio y los controles de Ranaria, en lugar del `GamePlayer` mock.
5. **Cierre.** Partida como invitado y otra con sesión. Comprobación con MCP. Recorrer los criterios de aceptación. `npm run lint` y `npm run build`.

---

## Criterios de aceptación

Generales de integración:

- [ ] `npm run build` termina sin errores ni warnings de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] La consola no muestra errores ni avisos de hidratación en `/games`, `/games/ranaria`, `/games/ranaria/play` y `/hall-of-fame`.
- [ ] `/games` muestra la tarjeta de RANARIA con la portada `cover-rana` y `/hall-of-fame` su pestaña.
- [ ] `/games/ranaria/play` muestra el canvas en la CRT con el overlay de inicio y los 2 controles de Ranaria. El juego no avanza hasta pulsar Espacio.
- [ ] El canvas se ve nítido con `devicePixelRatio` 2 y sin deformar: las celdas son cuadradas y los nenúfares son círculos.
- [ ] El canvas no dibuja puntuación, vidas, nivel, pausa ni game over. Además del tablero solo dibuja la barra de tiempo con su etiqueta `TIEMPO`.
- [ ] Flechas y Espacio no hacen scroll durante la partida.
- [ ] P, Esc y el botón PAUSA pausan y reanudan. Cambiar de pestaña o salir de la ventana pausa la partida y no se reanuda sola.
- [ ] Durante la pausa la barra de tiempo no se vacía.
- [ ] El HUD React muestra Jugador, Puntuación, Vidas y Nivel, sin Líneas, y se actualiza durante la partida.
- [ ] Perder la tercera vida abre el modal con PUNTUACIÓN FINAL y NIVEL, sin LÍNEAS.
- [ ] Con sesión, el modal pasa a `▸ PUNTUACIÓN GUARDADA_` y `select * from scores order by id desc limit 1` devuelve `game_id = 'ranaria'` con esa puntuación.
- [ ] Una partida produce una sola fila en `scores` (también con Strict Mode).
- [ ] Sin sesión, el modal invita a iniciar sesión y no se inserta nada.
- [ ] Tras guardar, `/games/ranaria` muestra la marca en el leaderboard y en las estadísticas.
- [ ] `saveScore({ gameId: "ranaria", score: 15 })` devuelve `invalid`.
- [ ] JUGAR DE NUEVO empieza una partida nueva directamente con puntuación 0, 3 vidas, nivel 01, nenúfares vacíos y la barra llena.
- [ ] SALIR y VOLVER AL VAULT desmontan el juego: las flechas vuelven a hacer scroll y no queda ningún `requestAnimationFrame`.
- [ ] Emulando un dispositivo táctil, se muestra "REQUIERE TECLADO" y no arranca el motor.
- [ ] `get_advisors` (security y performance) no muestra avisos nuevos.
- [ ] Asteroids, Tetris, Arkanoid y Snake siguen igual (controles, HUD y guardado).

Jugabilidad:

- [ ] Cada ↑ hasta una fila nueva suma exactamente 10. Bajar y volver a subir a una fila ya alcanzada por esa rana no suma.
- [ ] Mantener ↑ pulsado hace un solo salto.
- [ ] Pulsar ↓ en la acera de salida no mueve la rana.
- [ ] Un vehículo que toca la rana resta una vida, y la rana nueva sale en la fila 12, columna 9, con la barra llena.
- [ ] Aterrizar en el río fuera de un tronco o de unas tortugas resta una vida.
- [ ] Sobre un tronco, la rana se mueve con él. Si el tronco la saca del campo, se pierde una vida.
- [ ] Unas tortugas buceadoras sumergidas bajo la rana le quitan una vida. Las mismas tortugas a flote la sostienen.
- [ ] Saltar al seto o a un nenúfar ocupado resta una vida.
- [ ] Entrar en un nenúfar libre suma 50 más 10 por cada segundo entero restante, y el nenúfar queda con una rana dibujada.
- [ ] Al ocupar el quinto nenúfar se suman 1.000, el HUD pasa a NIVEL 02 y el coche rápido de la fila 8 pasa de 150 a 168 px/s.
- [ ] A partir del nivel 11 las velocidades dejan de crecer (×2,2).
- [ ] Sin moverse, la barra se vacía en 30 s y al llegar a 0 se pierde una vida.
- [ ] La barra es verde por encima del 50 %, amarilla entre el 20 % y el 50 % y magenta por debajo del 20 %.
- [ ] Durante la animación de muerte (700 ms) las flechas no mueven la rana.

---

## Decisiones

- **Sí:** motor TypeScript sin React con el contrato `GameFactory` de SPEC 05. React solo monta el canvas y escucha callbacks.
- **Sí:** reutilizar `scores`, `saveScore`, `get_leaderboard` y las estadísticas existentes. Se activan con `isPlayable`.
- **No:** tabla, acción o función de ranking propias del juego.
- **Sí:** reutilizar la fila `ranaria` sin migración. Su id ya es el `game-id` elegido y sus textos describen exactamente esta variante.
- **No:** fila nueva (dejaría una RANARIA mock duplicada) ni renombrado (no hay id distinto al que mover).
- **Sí:** id `ranaria` y título `RANARIA`. Es el tema recibido, ya está en el catálogo y no usa la marca Frogger.
- **Sí:** diseño desde cero con reglas de Frogger clásico. No hay `game.js` ni assets de referencia.
- **Sí:** temporizador dibujado en el canvas como barra TIEMPO en la banda inferior. Es un indicador sin equivalente en el HUD (como el `3x N.Ns` de Asteroids o la siguiente pieza de Tetris) y el original lo pinta en pantalla.
- **No:** ampliar `HudStat` con una celda de tiempo. Obligaría a tocar `types.ts`, `meta.ts`, `engine-player.tsx` y el CSS solo para este juego. Además, una barra que se encoge cada frame por `onStats` haría renderizar React 60 veces por segundo.
- **Sí:** 3 vidas, HUD con Vidas y Nivel. Encaja 1:1 en el HUD existente, como Asteroids y Arkanoid.
- **Sí:** campo de 19 columnas de 40 px centrado con 20 px de seto a cada lado. Con un número impar de columnas, la salida y los 5 nenúfares quedan simétricos.
- **Sí:** 5 carriles de río y 5 de carretera con una mediana, como el original.
- **Sí:** `scoreStep = 10` con +10 por fila nueva, +50 por nenúfar, +10 por segundo restante y +1.000 por nivel. Es la tabla del arcade adaptada a segundos enteros, y todo es múltiplo de 10.
- **No:** bonus por medio segundo (el original lo hace). Con segundos enteros la regla es más fácil de comprobar.
- **Sí:** ignorar `e.repeat`. El Frogger se juega a golpes de tecla, y la autorrepetición haría cruzar la carretera manteniendo ↑.
- **Sí:** 1 salto pendiente. Sin él, una pulsación justo antes de aterrizar se pierde.
- **Sí:** `x` continua en el río y ajustada a la columna fuera de él. La rana viaja con los troncos de forma natural y la rejilla de la carretera queda limpia.
- **Sí:** tolerancia de 20 px para entrar en un nenúfar. Se llega desde un tronco en movimiento, así que una ventana de 40 px es exigente pero justa.
- **Sí:** la velocidad sube un 12 % por nivel hasta ×2,2 y el tiempo no cambia. La dificultad crece de forma visible con una sola regla.
- **No:** carriles con patrones distintos por nivel, cocodrilos, serpientes o moscas. Son mejoras sobre el MVP clásico.
- **Sí:** los carriles vuelven a su posición inicial al cambiar de nivel y al reiniciar. Cada nivel empieza igual y es comprobable.
- **Sí:** muerte animada 700 ms y transición de nivel de 1 s como `playing`. Mismo criterio que la pérdida de vida de Arkanoid.
- **No:** sonido. Mismo criterio que SPEC 05; el audio irá en su propia spec para todos los juegos.
- **No:** ratón. El salto por celdas no lo necesita.
- **Sí:** mantener `.cover-rana`. Ya existe y representa carriles y una rana verde.

---

## Riesgos

| Riesgo                                                                  | Mitigación                                                                                                                                    |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta dos veces el motor                                    | `destroy()` cancela el rAF y quita listeners; todo el estado vive en el closure; el guardado va ligado al id de partida.                      |
| La autorrepetición del teclado cruza carriles sola                      | `e.repeat` se ignora y solo hay 1 salto pendiente, que se descarta al pausar, reanudar y reiniciar.                                           |
| Un objeto aparece o desaparece de golpe al envolver el carril           | El patrón de cada carril mide al menos 19 + `len` celdas y los objetos se recortan al campo.                                                  |
| Un vehículo rápido atraviesa la rana en un frame lento                  | `dt` limitado a 50 ms: a ×2,2 el coche rápido avanza 16,5 px por frame, menos que la caja de 28 px de la rana.                                |
| Entrar en un nenúfar desde un tronco en movimiento es demasiado difícil | Tolerancia de 20 px (ventana de 40 px, una celda). Si en pruebas resulta injusto, se ajusta la constante `HOME_TOLERANCE`.                    |
| La portada `.cover-rana` sale vacía como pasó con `.cover-snake`        | Hay criterio de aceptación. Sus `background` no llevan posición ni tamaño, así que no tienen el fallo de SPEC 12; si fallara, va a otra spec. |

---

## Lo que **no** entra en esta spec

- Sonido.
- Controles táctiles.
- Mejoras sobre el Frogger clásico (moscas, cocodrilos, serpientes, nutrias, rana acompañante, vida extra, patrones por nivel).
- Temporizador en el HUD React.
- Sprites o assets de imagen.
- Rediseño de la portada.
- WASD o teclas configurables.
- Antitrampas real.

Cada uno de estos puntos, si llega, va en su propia spec.

> Si se elige esta variante, se mueve a `specs/13-ranaria-jugable.md` (siguiente número libre), se renumera la cabecera a `SPEC 13`, pasa a `Aprobado` y se implementa con `/spec-impl`.

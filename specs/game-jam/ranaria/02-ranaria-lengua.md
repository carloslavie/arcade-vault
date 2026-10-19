# GAME JAM ranaria · 02 — RANARIA jugable (lengua y moscas)

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06, SPEC 10
> **Fecha:** 2026-10-16
> **Tema:** Ranaria — un juego estilo Frogger para Arcade Vault
> **Objetivo:** Crear un Frogger nuevo como motor TypeScript jugable en `/games/ranaria/play`, con sus puntuaciones guardadas en `scores` y visibles en el leaderboard, la biblioteca y el Salón de la Fama.

---

## Por qué existe esta spec

Hoy el catálogo tiene la fila mock `ranaria` (RANARIA, ARCADE, `cover-rana`, `green`, dificultad 3, `sort_order = 7`), que describe un Frogger pero no tiene motor y no aparece en la biblioteca (SPEC 08).
No hay `game.js` ni assets de referencia en `references/`, así que esta spec fija todas las reglas: tablero, carriles, velocidades, puntuación, niveles y condición de fin.
Esta variante añade un giro ligado al tema: la rana atrapa moscas con la lengua (Espacio). Cada mosca da puntos crecientes en racha y +5 s de tiempo.
El tiempo deja de ser solo una amenaza y pasa a ser un recurso: la rana tiene 20 s, y cazar moscas da margen y más bonus al llegar al nenúfar.
Como el jugador tiene que gestionar ese recurso, el temporizador va en el HUD React como una celda nueva `time` de `HudStat`, con su impacto en `types.ts`, `meta.ts`, `engine-player.tsx` y el CSS.
Esa ampliación va como bloque "Preparación de la plataforma", igual que en SPEC 10, y deja los otros cuatro juegos exactamente igual.
El resto (`saveScore`, leaderboard, estadísticas, Salón de la Fama) se activa con `isPlayable` sin código nuevo.

---

## Alcance

**Dentro:**

- **Preparación de la plataforma (celda de tiempo en el HUD):**
  - `lib/engines/types.ts`: `GameStats` gana `time?: number` (segundos enteros restantes). Solo lo emiten los juegos con temporizador.
  - `lib/engines/meta.ts`: `HudStat` pasa a `"lives" | "lines" | "level" | "time"`. `GameMeta` gana `timeLimit?: number` (segundos con los que empieza cada vida; solo para juegos con `"time"` en `hud`).
  - `components/engine-player.tsx`:
    - `HUD_LABELS.time = "Tiempo"`.
    - `hudValue("time")` devuelve `String(stats.time ?? 0).padStart(2, "0")`.
    - `initialStats` añade `time: meta.timeLimit ?? 0` si `hud` incluye `"time"`.
    - La celda de tiempo lleva además la clase `low` cuando `time ≤ 5` (constante `TIME_LOW = 5` del componente).
    - El modal de fin no muestra el tiempo (solo PUNTUACIÓN FINAL y NIVEL).
  - `app/globals.css`, diseñado con `/frontend-design` siguiendo `.hud-stat.level`:
    - `.hud-stat.time .v` en `--green` con `text-shadow` verde.
    - `.hud-stat.time.low .v` en `--magenta` con parpadeo de 0,5 s (`steps`). Sin parpadeo con `prefers-reduced-motion: reduce`.
  - El `switch` de `hudValue` sigue siendo exhaustivo: TypeScript obliga a cubrir `"time"`.
  - Asteroids, Tetris, Arkanoid y Snake no cambian: sus entradas de `GAME_META` no usan `"time"` ni `timeLimit`.
- **Motor de Ranaria en TypeScript**, sin React, en `lib/engines/ranaria/`:
  - Canvas lógico `W = 800`, `H = 600`, ya 4:3: ocupa toda la CRT sin bandas. Buffer × `devicePixelRatio`.
  - Rejilla de `CELL = 40` px. El campo tiene `COLS = 19` columnas, de `x = 20` a `x = 780`. Los 20 px de cada lado son seto decorativo.
  - Bandas superior (`y = 0–40`) e inferior (`y = 560–600`): seto decorativo. No hay barra de tiempo en el canvas.
  - 13 filas de juego desde `TOP = 40`; la fila `r` ocupa `y = 40 + 40·r`:

    | Fila | Tipo                                                        |
    | ---- | ----------------------------------------------------------- |
    | 0    | Meta: seto con 5 nenúfares en las columnas 1, 5, 9, 13 y 17 |
    | 1–5  | Río                                                         |
    | 6    | Mediana (segura)                                            |
    | 7–11 | Carretera                                                   |
    | 12   | Acera de salida (segura)                                    |

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
  - **Lengua (el giro):** Espacio en `playing` lanza la lengua en la dirección a la que mira la rana.
    - Se extiende hasta `TONGUE_REACH = 80` px (2 celdas) en 100 ms y se recoge en otros 100 ms.
    - Solo se puede lanzar si la rana no está saltando y la lengua está recogida. `e.repeat` se ignora.
    - Con la lengua fuera, las flechas se ignoran (no se guardan como salto pendiente).
    - Atrapa toda mosca cuyo centro quede a menos de `FLY_RADIUS = 16` px del segmento entre la rana y la punta en algún frame.
    - La lengua no afecta a vehículos, troncos ni tortugas.
  - **Moscas:**
    - Como mucho `MAX_FLIES = 2` a la vez. Cada `FLY_SPAWN_MS = 3000` ms, si hay menos de 2, aparece una.
    - Posición al azar: 50 % sobre un tronco (se mueve con él), 25 % en la mediana en una columna al azar y 25 % sobre un nenúfar libre. Si no queda nenúfar libre, va a la mediana.
    - Una mosca dura `FLY_LIFE = 7` s y parpadea en su último 1,5 s. Si su tronco sale del campo, desaparece.
    - La rana también la atrapa tocándola con el cuerpo (centros a menos de 20 px), por ejemplo al saltar a su celda de la mediana o al entrar en su nenúfar.
    - Cada mosca atrapada suma `100 × racha` puntos y +5 s de tiempo, con un tope de 30 s.
    - La racha es el número de moscas atrapadas desde la última muerte, contando esta, con un tope de 5: 100, 200, 300, 400, 500, 500…
    - Morir pone la racha a 0. Llegar a un nenúfar no la reinicia.
    - Las moscas se borran al cambiar de nivel y al reiniciar. Al morir se quedan.
  - **Río:** al aterrizar en una fila de río, la rana necesita que su centro quede sobre un tronco o un grupo de tortugas a flote. Si no, se ahoga.
    - Sobre una plataforma, la rana se desplaza con ella (`velocidad × dt`). Durante un salto no se desplaza.
    - Si las tortugas bajo la rana se sumergen, se ahoga.
    - Si la plataforma la saca del campo (centro fuera de `[20, 780]`), muere.
  - **Carretera:** si la caja de la rana toca la caja de un vehículo (recortada 4 px por cada lado en horizontal), muere. Se comprueba cada frame con la posición interpolada.
  - **Meta:** al saltar a la fila 0, la rana entra en un nenúfar libre si su centro está a menos de `HOME_TOLERANCE = 20` px del centro de ese nenúfar (`x = 80, 240, 400, 560, 720`). En el seto o en un nenúfar ocupado, muere.
    - Si hay una mosca en ese nenúfar, primero se atrapa (puntos y +5 s) y después se calcula el bonus de tiempo.
    - Al entrar, la rana se coloca en el centro del nenúfar, que queda ocupado, y sale una rana nueva en la salida con el tiempo de una vida.
  - **Temporizador:** `TIME_LIMIT = 20` s por rana, con tope `TIME_MAX = 30` s gracias a las moscas. Se reinicia a 20 s al llegar a un nenúfar y al perder una vida. Se congela durante la animación de muerte y la transición de nivel. Si llega a 0, la rana muere.
    - El motor emite `time = ceil(timeLeft)` por `onStats` solo cuando cambia (como mucho una vez por segundo y en cada mosca).
  - **Vidas:** 3. Cualquier muerte (vehículo, agua, salir del campo, seto, nenúfar ocupado, tiempo agotado) resta una vida.
    - La muerte se anima durante 700 ms (anillo que se expande: `--magenta` en carretera, `--cyan` en el río) y la entrada se ignora mientras dura.
    - Después, si quedan vidas, sale una rana nueva en la salida. Si no, la partida termina.
  - **Niveles:** al ocupar los 5 nenúfares se suma el bonus de nivel y hay una transición de 1 s con las 5 ranas visibles. Después se vacían los nenúfares, sube el nivel, la rana vuelve a la salida y los carriles vuelven a sus posiciones iniciales.
    - Todas las velocidades de carril se multiplican por `min(2.2, 1 + 0.12·(nivel − 1))`. El tope se alcanza en el nivel 11.
    - El límite de tiempo y las reglas de las moscas no cambian con el nivel.
  - `dt` del rAF limitado a 50 ms.
- **Estética:** neón vectorial, sin assets.
  - Fondo `#000`.
  - Río con relleno `#001a2e`. Carretera `#000` con líneas discontinuas de carril en `--ink` con alpha 0,15.
  - Mediana y acera de salida en `--magenta` con alpha 0,15. Seto en `--green` con alpha 0,25.
  - Nenúfares: contorno circular `--green`. Rana en un nenúfar ocupado: la misma rana `--green`.
  - Rana: cuerpo `--green`, ojos `--ink`, patas en trazo `--green`. Al saltar se escala a 1,15 a mitad del salto.
  - Lengua: trazo `--magenta` de 4 px con la punta redondeada.
  - Mosca: cuerpo `--yellow` de 4 px de radio con dos alas elípticas `--ink` con alpha 0,6 que aletean. Al atraparla, un anillo `--yellow` se expande 200 ms.
  - Troncos: contorno naranja neón `#ff9f1c` con relleno al 25 %. Tortugas: círculos `#ff3b3b` (el mismo rojo que Tetris y Arkanoid). Hundiéndose, alpha 0,5. Sumergidas, solo el contorno con alpha 0,15.
  - Vehículos: camión `#ff9f1c`, coche rápido `--magenta`, coches de las filas 9 y 11 `--cyan` y `--yellow`, tractor `#ff3b3b`.
  - Los objetos se recortan (`clip`) al campo `x = 20–780`.
  - Glow con `shadowBlur` por grupo (carriles, moscas, rana y lengua). Colores de `:root` con fallback a sus hex.
  - El canvas no dibuja HUD: puntuación, vidas, nivel y tiempo salen por `onStats`.
  - El canvas no dibuja pausa ni game over.
- **Fases** `ready → playing ⇄ paused → over`, igual que SPEC 05: Espacio empieza, y P/Esc o la pérdida de foco pausan; la partida nunca se reanuda sola.
  - En `ready` se ven los carriles quietos en sus posiciones iniciales, la rana en la salida y ninguna mosca. Espacio solo empieza la partida, no lanza la lengua.
  - La animación de muerte y la transición de nivel cuentan como `playing`.
  - Perder la última vida o pulsar FIN pasan a `over`.
- **Controles:**

  | Entrada               | Acción                                       |
  | --------------------- | -------------------------------------------- |
  | `←` / `↑` / `→` / `↓` | Saltar                                       |
  | `Espacio`             | Lengua (en `playing`) / Empezar (en `ready`) |
  | `P` / `Esc`           | Pausa                                        |
  - Teclas por `e.code` (`ArrowLeft`, `ArrowUp`, `ArrowRight`, `ArrowDown`, `Space`, `KeyP`, `Escape`).
  - El salto pendiente se descarta y la lengua se recoge al pausar, reanudar y reiniciar.
  - Sin ratón ni WASD.

- **HUD React:** Jugador, Puntuación, Vidas, Nivel y Tiempo (sin Líneas). **Modal de fin:** PUNTUACIÓN FINAL y NIVEL.
- **Catálogo:** se reutiliza la fila `ranaria` y se actualiza su `long` para mencionar las moscas, mediante una migración. Se mantienen `title = RANARIA`, `short`, `cat = ARCADE`, `cover = cover-rana`, `color = green`, `difficulty = 3` y `sort_order = 7`.
- **Registro:** `ranaria` en `PLAYABLE_GAME_IDS`, `ENGINES` y `GAME_META` (`scoreStep: 10`, `initialLives: 3`, `hud: ["lives", "level", "time"]`, `timeLimit: 20`).
- CSS solo para la celda de tiempo (`.hud-stat.time` y `.hud-stat.time.low`), con `/frontend-design`. `.cover-rana`, `.hud-stat.lives`, `.hud-stat.level` y `.final-level` ya existen.

**Fuera de alcance (para futuras specs):**

- Sonido.
- Controles táctiles y jugabilidad en móvil.
- Mejoras sobre esta variante: cocodrilos en los nenúfares, serpientes en la mediana, nutrias, rana acompañante, moscas doradas o con valores distintos, lengua que empuja objetos, vida extra por puntuación, carriles que cambian de patrón por nivel.
- Mostrar el tiempo restante en el modal de fin, el leaderboard o el Salón de la Fama.
- Una celda "barra" genérica en el HUD (la celda `time` es un número).
- Sprites o assets de imagen.
- Rediseño de la portada `.cover-rana`.
- WASD o teclas configurables.
- Antitrampas real.

---

## Modelo de datos

### Migración — `supabase/migrations/20261016120000_update_ranaria.sql`

```sql
-- Same id and title: only the long text changes to mention the flies.
update public.games
   set long = 'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Atrapa moscas con la lengua para ganar segundos y llega a los nenúfares antes de que se agote el tiempo.'
 where id = 'ranaria';
```

No cambia el esquema: no hace falta `npm run db:types`.

### Contrato (`lib/engines/types.ts`)

```ts
export interface GameStats {
  score: number;
  level: number;
  lives?: number; // asteroids
  lines?: number; // tetris
  time?: number; // ranaria: whole seconds left
}
```

### Metadatos (`lib/engines/meta.ts`)

```ts
export type HudStat = "lives" | "lines" | "level" | "time";

export interface GameMeta {
  scoreStep: number;
  initialLives: number | null;
  hud: HudStat[];
  timeLimit?: number; // seconds per life, only with "time" in hud
  controls: { keys: string[]; label: string }[];
}

ranaria: {
  scoreStep: 10,
  initialLives: 3,
  hud: ["lives", "level", "time"],
  timeLimit: 20,
  controls: [
    { keys: ["←", "↑", "→", "↓"], label: "Saltar" },
    { keys: ["ESPACIO"], label: "Lengua" },
    { keys: ["P", "ESC"], label: "Pausa" },
  ],
},
```

`timeLimit` es opcional, así que las entradas de los otros cuatro juegos no cambian.
Las etiquetas de `controls` no se repiten porque `EnginePlayer` las usa como `key`.

### Archivos del motor

- `lib/engines/ranaria/lanes.ts`: tipo `Lane = { row: number; kind: "log" | "turtle" | "truck" | "car" | "fast" | "tractor"; len: number; count: number; gap: number; dir: 1 | -1; speed: number; divers: number[]; color: string }` y `LANES: Lane[]` con los 10 carriles del nivel 1. `divers` son los índices de grupos de tortugas que bucean. Solo datos, tipado.
- `lib/engines/ranaria/entities.ts`: constantes (`W`, `H`, `CELL = 40`, `COLS = 19`, `FIELD_X = 20`, `TOP = 40`, `START_ROW = 12`, `START_COL = 9`, `HOME_COLS = [1, 5, 9, 13, 17]`, `HOME_TOLERANCE = 20`, `HOP_MS = 120`, `TIME_LIMIT = 20`, `TIME_MAX = 30`, `FLY_TIME_BONUS = 5`, `TONGUE_REACH = 80`, `TONGUE_MS = 100`, `FLY_RADIUS = 16`, `MAX_FLIES = 2`, `FLY_SPAWN_MS = 3000`, `FLY_LIFE = 7`, `MAX_STREAK = 5`, `DEATH_MS = 700`, `LEVEL_CLEAR_MS = 1000`, `DIVE_CYCLE = [2.5, 0.5, 1]`, `SPEED_STEP = 0.12`, `MAX_SPEED_MUL = 2.2`, puntos), tipos (`Dir`, `Frog`, `Tongue`, `Fly`, `LaneState`) y helpers puros (`speedMul`, `laneObjects`, `isSupported`, `hitsVehicle`, `homeAt`, `tongueTip`, `pointSegmentDistance`, `spawnFly`, `drawBoard`, `drawLanes`, `drawHomes`, `drawFlies`, `drawFrog`, `drawTongue`, `drawDeath`). Sin globals.
- `lib/engines/ranaria/engine.ts`: `createRanariaGame: GameFactory`. Contiene el estado (`frog`, `pendingHop`, `tongue`, `flies`, `flySpawnTimer`, `streak`, `lanes` con su desplazamiento, `homes: boolean[]`, `maxRowThisFrog`, `timeLeft`, `score`, `lives`, `level`, `deathTimer`, `clearTimer`, `diveClock`), el input, el bucle rAF, las colisiones y el render.

### Puntuación

| Acción                                                | Puntos                                           |
| ----------------------------------------------------- | ------------------------------------------------ |
| Saltar a una fila más alta que la máxima de esta rana | 10                                               |
| Atrapar una mosca                                     | 100 × racha (racha 1–5): 100, 200, 300, 400, 500 |
| Entrar en un nenúfar libre                            | 50                                               |
| Bonus de tiempo al entrar en un nenúfar               | 10 × segundos enteros restantes (hasta 30)       |
| Ocupar los 5 nenúfares                                | 1.000                                            |

`scoreStep = 10`. La fila máxima se reinicia con cada rana nueva (tras un nenúfar o una muerte).
Sin morir, a partir de la quinta mosca cada una vale 500, así que una partida larga sube rápido, pero sigue lejos del máximo.
El motor limita la puntuación a 10.000.000.

---

## Plan de implementación

1. **Preparación de la plataforma.**
   - `time?` en `GameStats`, `"time"` en `HudStat` y `timeLimit?` en `GameMeta`.
   - `EnginePlayer`: etiqueta, valor, estadística inicial y clase `low` de la celda de tiempo.
   - Ejecutar `/frontend-design` para `.hud-stat.time` y `.hud-stat.time.low` en `app/globals.css`.
   - Verificar: `npm run build` pasa y Asteroids, Tetris, Arkanoid y Snake se ven y juegan igual (mismas celdas del HUD y mismo modal).
2. **Migración del catálogo.** Crear y aplicar `20261016120000_update_ranaria.sql` con `npx supabase db push`. Verificar con MCP `execute_sql` que `ranaria` tiene el `long` nuevo y conserva `title`, `cat`, `cover`, `difficulty = 3` y `sort_order = 7`.
3. **Carriles y entidades.** Leer `.claude/skills/add-game/porting-guide.md`. Crear `lib/engines/ranaria/lanes.ts` y `lib/engines/ranaria/entities.ts` con las constantes y helpers. Verificar: `npm run build` pasa.
4. **Motor base.** Crear `lib/engines/ranaria/engine.ts` con `createRanariaGame`, sin moscas ni lengua todavía:
   - Fases, pausa por `blur` / `visibilitychange`, `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar y reiniciar.
   - Teclado por `e.code` en `window`, ignorando `e.repeat`. `preventDefault` en flechas y Espacio solo en `ready`, `playing` y `paused`.
   - Salto, arrastre en el río, buceo de tortugas, colisiones, metas, temporizador de 20 s, muerte y transición de nivel.
   - `onStats` con `score`, `lives`, `level` y `time` solo cuando cambian.
   - `destroy()` cancela el rAF y quita todos los listeners.
5. **Registro.** Añadir `ranaria` a `PLAYABLE_GAME_IDS`, `ENGINES` (`createRanariaGame`) y `GAME_META`. Verificar: `/games/ranaria/play` monta el motor con el overlay de inicio, los 3 controles y la celda Tiempo en 20.
6. **Lengua y moscas.** Añadir la lengua, la aparición y vida de las moscas, la captura con lengua y con el cuerpo, la racha y el bonus de +5 s con tope de 30. Verificar: atrapar una mosca suma 100 y el HUD sube 5 s.
7. **Cierre.** Partida como invitado y otra con sesión. Comprobación con MCP. Recorrer los criterios de aceptación. `npm run lint` y `npm run build`.

---

## Criterios de aceptación

Generales de integración:

- [ ] `npm run build` termina sin errores ni warnings de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] La consola no muestra errores ni avisos de hidratación en `/games`, `/games/ranaria`, `/games/ranaria/play` y `/hall-of-fame`.
- [ ] `/games` muestra la tarjeta de RANARIA con la portada `cover-rana` y `/hall-of-fame` su pestaña.
- [ ] `/games/ranaria` muestra el `long` nuevo con las moscas.
- [ ] `/games/ranaria/play` muestra el canvas en la CRT con el overlay de inicio y los 3 controles de Ranaria. El juego no avanza hasta pulsar Espacio.
- [ ] El canvas se ve nítido con `devicePixelRatio` 2 y sin deformar: las celdas son cuadradas y los nenúfares son círculos.
- [ ] El canvas no dibuja puntuación, vidas, nivel, tiempo, pausa ni game over.
- [ ] Flechas y Espacio no hacen scroll durante la partida.
- [ ] P, Esc y el botón PAUSA pausan y reanudan. Cambiar de pestaña o salir de la ventana pausa la partida y no se reanuda sola.
- [ ] Durante la pausa la celda Tiempo no baja.
- [ ] El HUD React muestra Jugador, Puntuación, Vidas, Nivel y Tiempo, sin Líneas, y se actualiza durante la partida.
- [ ] Perder la tercera vida abre el modal con PUNTUACIÓN FINAL y NIVEL, sin LÍNEAS ni tiempo.
- [ ] Con sesión, el modal pasa a `▸ PUNTUACIÓN GUARDADA_` y `select * from scores order by id desc limit 1` devuelve `game_id = 'ranaria'` con esa puntuación.
- [ ] Una partida produce una sola fila en `scores` (también con Strict Mode).
- [ ] Sin sesión, el modal invita a iniciar sesión y no se inserta nada.
- [ ] Tras guardar, `/games/ranaria` muestra la marca en el leaderboard y en las estadísticas.
- [ ] `saveScore({ gameId: "ranaria", score: 15 })` devuelve `invalid`.
- [ ] JUGAR DE NUEVO empieza una partida nueva directamente con puntuación 0, 3 vidas, nivel 01, tiempo 20, nenúfares vacíos y sin moscas.
- [ ] SALIR y VOLVER AL VAULT desmontan el juego: las flechas vuelven a hacer scroll y no queda ningún `requestAnimationFrame`.
- [ ] Emulando un dispositivo táctil, se muestra "REQUIERE TECLADO" y no arranca el motor.
- [ ] `get_advisors` (security y performance) no muestra avisos nuevos.

Preparación de la plataforma:

- [ ] Asteroids sigue igual: los mismos 4 controles, HUD con Vidas y Nivel, sin Tiempo, y `saveScore({ gameId: "asteroids", score: 15 })` devuelve `invalid`.
- [ ] Tetris sigue mostrando Líneas y Nivel, Arkanoid Vidas y Nivel, y Snake solo Nivel. Ninguno muestra Tiempo.
- [ ] La celda Tiempo de Ranaria se pone magenta y parpadea con 5 s o menos, y vuelve a verde al subir de 5 s.
- [ ] Con `prefers-reduced-motion: reduce` la celda Tiempo se pone magenta sin parpadear.
- [ ] El HUD React no se vuelve a renderizar en cada frame: con React DevTools, la celda Tiempo cambia como mucho una vez por segundo si no hay moscas ni puntos.

Jugabilidad:

- [ ] Cada ↑ hasta una fila nueva suma exactamente 10. Bajar y volver a subir a una fila ya alcanzada por esa rana no suma.
- [ ] Mantener ↑ pulsado hace un solo salto.
- [ ] Un vehículo que toca la rana resta una vida, y la rana nueva sale en la fila 12, columna 9, con Tiempo 20.
- [ ] Aterrizar en el río fuera de un tronco o de unas tortugas resta una vida.
- [ ] Sobre un tronco, la rana se mueve con él. Si el tronco la saca del campo, se pierde una vida.
- [ ] Unas tortugas buceadoras sumergidas bajo la rana le quitan una vida.
- [ ] Saltar al seto o a un nenúfar ocupado resta una vida.
- [ ] Sin moverse ni cazar moscas, Tiempo pasa de 20 a 0 en 20 s y al llegar a 0 se pierde una vida.
- [ ] Espacio en `playing` saca la lengua 2 celdas en la dirección a la que mira la rana y la recoge en unos 200 ms.
- [ ] Con la lengua fuera, las flechas no mueven la rana.
- [ ] Una mosca a 2 celdas delante de la rana se atrapa con la lengua. Una mosca a 3 celdas no.
- [ ] Saltar a la celda de una mosca en la mediana la atrapa sin usar la lengua.
- [ ] La primera mosca suma 100 y la segunda 200 sin morir entre medias. Tras morir, la siguiente vuelve a valer 100.
- [ ] A partir de la quinta mosca seguida, cada una vale 500.
- [ ] Cada mosca sube Tiempo 5 s, y Tiempo nunca pasa de 30.
- [ ] Nunca hay más de 2 moscas a la vez, y una mosca desaparece a los 7 s si nadie la atrapa.
- [ ] Entrar en un nenúfar con una mosca suma la mosca y después 50 más 10 por segundo entero restante, con el tiempo ya ampliado.
- [ ] Al ocupar el quinto nenúfar se suman 1.000, el HUD pasa a NIVEL 02, desaparecen las moscas y el coche rápido de la fila 8 pasa de 150 a 168 px/s.

---

## Decisiones

- **Sí:** motor TypeScript sin React con el contrato `GameFactory` de SPEC 05. React solo monta el canvas y escucha callbacks.
- **Sí:** reutilizar `scores`, `saveScore`, `get_leaderboard` y las estadísticas existentes. Se activan con `isPlayable`.
- **No:** tabla, acción o función de ranking propias del juego.
- **Sí:** reutilizar la fila `ranaria` y actualizar solo su `long`. El id ya es el `game-id` y el texto actual no menciona las moscas, que son la regla nueva.
- **No:** fila nueva (dejaría una RANARIA mock duplicada) ni renombrado (no hay id distinto al que mover).
- **Sí:** nombre de migración `update_ranaria`. No es `add` ni `rename`: el id no cambia y solo se reescribe un texto, como permite `integration-checklist.md`.
- **Sí:** id `ranaria` y título `RANARIA`. Es el tema recibido, ya está en el catálogo y no usa la marca Frogger.
- **Sí:** la lengua y las moscas como giro. Es lo más propio de una rana y cambia de verdad las reglas: hay un botón nuevo, la puntuación tiene racha y el tiempo se gana.
- **Sí:** temporizador en el HUD React con una celda nueva `time` de `HudStat`. En esta variante el tiempo es un recurso que se gana con moscas, y el jugador lo consulta como las vidas.
- **No:** dibujarlo en el canvas. La regla "el canvas no dibuja HUD" pide sacar las estadísticas que el jugador gestiona, y otros juegos con contrarreloj (joyas, alunizaje) podrán reutilizar la celda.
- **Sí:** la celda muestra segundos enteros y el motor los emite solo al cambiar. React se renderiza como mucho una vez por segundo, en lugar de 60 con una barra continua.
- **No:** una celda "barra" con anchura proporcional. Necesitaría el máximo en el HUD, estilos en línea y más CSS; un número en dos cifras basta y encaja con Vidas y Nivel.
- **Sí:** `timeLimit?` opcional en `GameMeta`. Da el valor inicial de la celda antes de la primera emisión sin tocar las entradas de los otros juegos.
- **Sí:** clase `low` con 5 s o menos, decidida en `EnginePlayer` con `TIME_LOW`. Es un aviso visual genérico para cualquier juego con tiempo, y el motor no sabe nada del HUD.
- **No:** mostrar el tiempo en el modal de fin. Al acabar siempre es irrelevante (o 0 o el de una rana a medias).
- **Sí:** 20 s por rana con tope de 30. Más corto que el clásico para que cazar moscas sea necesario, y con tope para que no se acumule tiempo sin límite.
- **Sí:** racha de 100 a 500 que se reinicia al morir. Premia jugar sin errores y hace que el ranking distinga a los mejores.
- **No:** reiniciar la racha al llegar a un nenúfar. Castigaría completar el objetivo principal.
- **Sí:** la lengua bloquea los saltos mientras está fuera. Cazar tiene un coste de tiempo y riesgo, sobre todo en el río.
- **Sí:** atrapar moscas también con el cuerpo. Una mosca en la mediana o en un nenúfar se puede coger sin lengua, como el bonus del original.
- **Sí:** moscas sobre troncos, en la mediana y en nenúfares libres, nunca en la carretera. Las moscas sobre la carretera obligarían a quedarse quieto entre coches, que no es la idea del giro.
- **Sí:** mismo tablero, carriles, vidas y progresión de velocidad que la variante clásica. El giro está en la lengua y el tiempo, no en el tráfico.
- **Sí:** ignorar `e.repeat` en flechas y Espacio. Mantener pulsado no debe cruzar carriles ni lanzar la lengua en bucle.
- **No:** sonido. Mismo criterio que SPEC 05; el audio irá en su propia spec para todos los juegos.
- **No:** ratón. La lengua apunta a donde mira la rana y el salto es por celdas.
- **Sí:** mantener `.cover-rana`. Ya existe y representa carriles y una rana verde.

---

## Riesgos

| Riesgo                                                               | Mitigación                                                                                                                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta dos veces el motor                                 | `destroy()` cancela el rAF y quita listeners; todo el estado vive en el closure; el guardado va ligado al id de partida.                        |
| La preparación de la plataforma rompe los otros juegos               | Paso 1 propio con verificación de los cuatro juegos. `timeLimit` es opcional y el `switch` exhaustivo de `hudValue` lo comprueba el compilador. |
| La celda Tiempo hace renderizar React demasiado                      | El motor emite segundos enteros y solo al cambiar; hay criterio de aceptación con React DevTools.                                               |
| La celda Tiempo muestra 00 antes de la primera emisión               | `initialStats` usa `timeLimit = 20`.                                                                                                            |
| El parpadeo de la celda molesta o falla en accesibilidad             | Parpadeo de 0,5 s solo con 5 s o menos, y desactivado con `prefers-reduced-motion`.                                                             |
| La racha hace que las puntuaciones crezcan sin control               | Tope de 500 por mosca y como mucho 2 moscas cada pocos segundos; el motor limita a 10.000.000.                                                  |
| La lengua atraviesa una mosca entre dos frames                       | La captura usa la distancia al segmento completo rana–punta en cada frame, no solo a la punta.                                                  |
| La autorrepetición del teclado cruza carriles o lanza la lengua sola | `e.repeat` se ignora; el salto pendiente se descarta y la lengua se recoge al pausar, reanudar y reiniciar.                                     |
| Un vehículo rápido atraviesa la rana en un frame lento               | `dt` limitado a 50 ms: a ×2,2 el coche rápido avanza 16,5 px por frame, menos que la caja de 28 px de la rana.                                  |

---

## Lo que **no** entra en esta spec

- Sonido.
- Controles táctiles.
- Cocodrilos, serpientes, nutrias, rana acompañante, moscas de otros tipos, vida extra, patrones por nivel.
- Tiempo restante en el modal, el leaderboard o el Salón de la Fama.
- Celda "barra" genérica en el HUD.
- Sprites o assets de imagen.
- Rediseño de la portada.
- WASD o teclas configurables.
- Antitrampas real.

Cada uno de estos puntos, si llega, va en su propia spec.

> Si se elige esta variante, se mueve a `specs/13-ranaria-jugable.md` (siguiente número libre), se renumera la cabecera a `SPEC 13`, pasa a `Aprobado` y se implementa con `/spec-impl`.

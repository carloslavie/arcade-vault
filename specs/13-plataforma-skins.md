# SPEC 13 — Plataforma de skins

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 10, SPEC 11, SPEC 12
> **Fecha:** 2026-10-16
> **Objetivo:** Crear el mecanismo genérico para que cada motor reciba y cambie en caliente una skin cosmética (`clasico`, `neon`, `retro`) elegida en el player y recordada por juego en `localStorage`.

---

## Por qué existe esta spec

Hoy cada motor tiene una única paleta neón leída de `:root` al crearse (`readPalette()` en `lib/engines/asteroids/engine.ts`, `arkanoid/engine.ts`, `snake/engine.ts` y la lista `COLORS` de `tetris/engine.ts`).
No hay tipo de skin, ni forma de pasar una skin al motor, ni selector en `components/engine-player.tsx`, ni persistencia.
La plataforma quiere que todo juego jugable tenga al menos 3 skins, con `clasico` (el look del original) por defecto.
Esta spec solo construye la infraestructura común.
Las paletas de cada juego van en su propia spec (`specs/skins/<game-id>-skins.md`), empezando por Asteroids.
Las skins son solo cosméticas: no cambian reglas, velocidades, hitboxes, puntuación ni `scoreStep`, así que un récord vale igual con cualquier skin.

---

## Alcance

**Dentro:**

- **Tipos y registro de skins** en `lib/engines/skins.ts` (server-safe, sin código de navegador):
  - `SKIN_IDS = ["clasico", "neon", "retro"] as const` y `SkinId = (typeof SKIN_IDS)[number]`.
  - `DEFAULT_SKIN: SkinId = "clasico"`.
  - `SKIN_LABELS: Record<SkinId, string>` con `CLÁSICO`, `NEÓN` y `RETRO`.
  - `isSkinId(value: unknown): value is SkinId`.
  - `SkinColor`: un hex fijo (`string`) o `{ cssVar: string; fallback: string }` para colores que se leen de `:root`.
  - `SkinDef<K extends string>`: `{ colors: Record<K, SkinColor>; glow: number }`. Cada motor puede ampliarlo con campos de render propios (por ejemplo `particleGlow`).
- **Resolución de colores en cliente** en `lib/engines/skin-colors.ts`:
  - `resolveColors(colors)` devuelve un `Record<K, string>` con hex finales.
  - Las entradas `{ cssVar, fallback }` se leen con `getComputedStyle(document.documentElement)` y usan `fallback` si la variable está vacía, igual que el `pick()` actual.
  - Las entradas `string` se devuelven tal cual.
- **Contrato de motores** (`lib/engines/types.ts`):
  - `GameOptions { skin: SkinId }`.
  - `GameFactory = (canvas, callbacks, options: GameOptions) => GameInstance`.
  - `GameInstance` gana `setSkin(id: SkinId): void`. Cambia la skin en caliente sin reiniciar la partida. Si la fase es `ready` o `paused`, el motor redibuja un fotograma para que el cambio se vea sin esperar al bucle.
- **Paletas por juego** en `lib/engines/<id>/skins.ts`, tipadas `Record<SkinId, ...>`. Añadir un id a `SKIN_IDS` obliga a definirlo en todos los juegos con skins, con el mismo patrón que `ENGINES` y `GAME_META`.
  - `neon` usa entradas `{ cssVar, fallback }` con las variables de `:root` (`--cyan`, `--magenta`, `--yellow`, `--green`, `--ink`) y sus hex actuales.
  - `clasico` y `retro` usan hex fijos: no dependen del tema de la plataforma.
  - Esta spec no crea ningún `skins.ts`: lo hace la spec de skins de cada juego.
- **Marca por juego** en `GameMeta` (`lib/engines/meta.ts`): campo `hasSkins: boolean`.
  - Esta spec lo deja en `false` para los 4 juegos.
  - Cada spec de skins de juego lo pone a `true` al registrar sus 3 skins.
  - Mientras sea `false`, el player no muestra selector y el motor ignora la skin.
- **Motores sin skins todavía** (`asteroids`, `tetris`, `arkanoid`, `snake` tras esta spec): aceptan el tercer parámetro sin usarlo e implementan `setSkin` como no-op con un comentario. Su render no cambia.
- **Preferencia de skin** en `lib/skin-preference.ts` (cliente, sin React):
  - Clave `av:skin:v1:<gameId>` en `localStorage`, valor un `SkinId`.
  - `readSkin(gameId)`: devuelve la skin guardada si `isSkinId` la acepta; si no existe, no es válida o `localStorage` lanza, devuelve `DEFAULT_SKIN`.
  - `writeSkin(gameId, id)`: guarda en un `Map` en memoria y en `localStorage` dentro de `try/catch`, y avisa a los suscriptores.
  - `subscribeSkin(callback)`: escucha el evento `storage` (otras pestañas) y los avisos de `writeSkin`. Devuelve la función para desuscribirse.
  - Si `localStorage` falla (modo privado, cuota), la elección dura lo que dure la pestaña gracias al `Map`.
- **Player** (`components/engine-player.tsx`):
  - Lee la skin con `useSyncExternalStore(subscribeSkin, () => readSkin(game.id), () => null)`. En el servidor y en la hidratación vale `null`, como `useIsTouch`.
  - El efecto que crea el motor le pasa `{ skin: readSkin(game.id) }`. Ese efecto **no** depende de la skin: cambiarla nunca recrea el motor ni corta la partida.
  - Un efecto aparte llama a `instanceRef.current?.setSkin(skin)` cuando la skin cambia.
  - Selector `SkinPicker` en la barra `.crt-bottom`, en el lugar del texto decorativo `CARGA · 1MB`, solo si `meta.hasSkins` es `true`, `isTouch === false` y la skin ya no es `null`. En otro caso se mantiene `CARGA · 1MB`.
  - El selector es un grupo (`role="group"`, `aria-label="Skin de pantalla"`) con la etiqueta `MODO` y 3 botones (`CLÁSICO`, `NEÓN`, `RETRO`) con `aria-pressed`.
  - Se puede usar en `ready`, `playing` y `paused`. En `over` queda tapado por el modal.
  - Al pulsar un botón se llama a `writeSkin` y se quita el foco del botón (`blur()`), para que Espacio no vuelva a activarlo mientras se juega.
- **Estilo del selector** diseñado con `/frontend-design` en `app/globals.css` (`.skin-picker`, `.skin-opt`), coherente con `references/templates/styles.css`:
  - Misma tipografía que `.crt-bottom` (`--pixel`, 8px) y la misma lógica de estados que `.chip`: inactivo en `--ink-faint`, hover en `--ink`, activo con borde y texto `--cyan` y un glow suave.
  - Sin iconos ni previsualizaciones de color.
- **HUD React, overlays de la CRT y modal** no forman parte de la skin: siguen con la estética neón de la plataforma. La skin solo afecta al contenido del `<canvas>`.

**Fuera de alcance (para futuras specs):**

- Paletas de cada juego (van en `specs/skins/<game-id>-skins.md`).
- Guardar la skin en Supabase, por usuario o sincronizada entre dispositivos.
- Skins de pago, desbloqueables o ligadas a logros.
- Skins que cambian HUD, overlays, modal, portadas o la carcasa `.crt`.
- Atajo de teclado para cambiar de skin.
- Mostrar en el leaderboard con qué skin se hizo un récord.
- Skin global para todos los juegos a la vez.

---

## Modelo

### Tipos (`lib/engines/skins.ts`, server-safe)

| Nombre         | Tipo / valor                                           | Uso                                                   |
| -------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| `SKIN_IDS`     | `["clasico", "neon", "retro"] as const`                | Orden de los botones del selector                     |
| `SkinId`       | `"clasico" \| "neon" \| "retro"`                       | Contrato, preferencia y `Record` por juego            |
| `DEFAULT_SKIN` | `"clasico"`                                            | Primera visita o valor guardado no válido             |
| `SKIN_LABELS`  | `{ clasico: "CLÁSICO", neon: "NEÓN", retro: "RETRO" }` | Texto de los botones                                  |
| `isSkinId`     | `(value: unknown) => value is SkinId`                  | Validar lo leído de `localStorage`                    |
| `SkinColor`    | `string \| { cssVar: string; fallback: string }`       | Color fijo o variable de `:root` con fallback         |
| `SkinDef<K>`   | `{ colors: Record<K, SkinColor>; glow: number }`       | Base de la skin de cada motor (`glow` = `shadowBlur`) |

### Contrato (`lib/engines/types.ts`)

| Cambio                 | Antes                                 | Después                                                     |
| ---------------------- | ------------------------------------- | ----------------------------------------------------------- |
| `GameFactory`          | `(canvas, callbacks) => GameInstance` | `(canvas, callbacks, options: GameOptions) => GameInstance` |
| `GameOptions`          | no existe                             | `{ skin: SkinId }`                                          |
| `GameInstance.setSkin` | no existe                             | `setSkin(id: SkinId): void`, válido en cualquier fase       |

### Metadatos (`lib/engines/meta.ts`)

| Juego       | `hasSkins` tras esta spec |
| ----------- | ------------------------- |
| `asteroids` | `false`                   |
| `tetris`    | `false`                   |
| `arkanoid`  | `false`                   |
| `snake`     | `false`                   |

### Persistencia (`localStorage`)

| Clave                 | Valor       | Ejemplo                          |
| --------------------- | ----------- | -------------------------------- |
| `av:skin:v1:<gameId>` | un `SkinId` | `av:skin:v1:asteroids` → `retro` |

El sufijo `v1` permite cambiar el formato más adelante sin leer valores antiguos como válidos.

---

## Plan de implementación

1. **Tipos.** Crear `lib/engines/skins.ts` con `SKIN_IDS`, `SkinId`, `DEFAULT_SKIN`, `SKIN_LABELS`, `isSkinId`, `SkinColor` y `SkinDef`. Verificar: `npm run build` pasa.
2. **Resolución de colores.** Crear `lib/engines/skin-colors.ts` con `resolveColors`. Verificar: `npm run build` pasa.
3. **Contrato.** Añadir `GameOptions` y el tercer parámetro a `GameFactory`, y `setSkin` a `GameInstance`. Añadir `setSkin() {}` (no-op, comentario `// Skins land in specs/skins/<id>-skins.md`) a los 4 motores. Verificar: `npm run build` pasa y los 4 juegos se ven igual que antes.
4. **Metadatos.** Añadir `hasSkins: boolean` a `GameMeta` y ponerlo a `false` en las 4 entradas de `GAME_META`. Verificar: `npm run build` pasa.
5. **Preferencia.** Crear `lib/skin-preference.ts` con `readSkin`, `writeSkin` y `subscribeSkin`. Verificar: `npm run build` pasa.
6. **Player.** En `components/engine-player.tsx`, leer la skin con `useSyncExternalStore`, pasar `{ skin: readSkin(game.id) }` a la factory y llamar a `setSkin` en un efecto aparte. Verificar: `/games/asteroids/play` funciona igual y no hay avisos de hidratación.
7. **Selector.** Ejecutar `/frontend-design` y crear `SkinPicker` en el mismo archivo junto a `.skin-picker` / `.skin-opt` en `app/globals.css`. Se renderiza solo si `meta.hasSkins`. Verificar: con `hasSkins: false` en los 4 juegos, `.crt-bottom` sigue mostrando `CARGA · 1MB`.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores ni warnings de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] `lib/engines/skins.ts` no importa nada de navegador y `lib/engines/meta.ts` sigue siendo importable desde el servidor.
- [ ] Quitar una entrada de un `Record<SkinId, ...>` hace fallar `npm run build`.
- [ ] `GameInstance` declara `setSkin(id: SkinId): void` y los 4 motores lo implementan.
- [ ] `GAME_META` tiene `hasSkins: false` en los 4 juegos tras esta spec.
- [ ] Con `hasSkins: false`, `/games/<id>/play` muestra `CARGA · 1MB` en `.crt-bottom` y ningún selector.
- [ ] Asteroids, Tetris, Arkanoid y Snake se ven y se juegan exactamente igual que antes de esta spec.
- [ ] La puntuación y la jugabilidad no cambian: `saveScore` y `scoreStep` no se tocan.
- [ ] `clasico` es la skin por defecto: con `localStorage` vacío, `readSkin("asteroids")` devuelve `clasico`.
- [ ] Con `av:skin:v1:asteroids = "dorado"` en `localStorage`, `readSkin("asteroids")` devuelve `clasico`.
- [ ] Con `localStorage` bloqueado (lanza al leer y al escribir), el player monta el motor sin errores en consola.
- [ ] La consola no muestra errores ni avisos de hidratación en `/games/<id>/play` para los 4 juegos.
- [ ] Emulando un dispositivo táctil se sigue mostrando "REQUIERE TECLADO" y no se renderiza el selector.

---

## Decisiones

- **Sí:** skin como opción de la factory más `setSkin` en `GameInstance`. El motor sigue sin saber de React ni de `localStorage` y la skin se puede cambiar en pausa sin perder la partida.
- **No:** recrear el motor al cambiar de skin. Perdería la partida en curso y obligaría a reiniciar el guardado de puntuación.
- **Sí:** `setSkin` redibuja si la fase es `ready` o `paused`. En esas fases el bucle no pinta y el cambio no se vería hasta reanudar.
- **Sí:** `SkinId` en un módulo server-safe propio (`lib/engines/skins.ts`). Lo pueden importar `meta.ts`, el player y los motores sin arrastrar código de navegador.
- **Sí:** `Record<SkinId, ...>` por juego en `lib/engines/<id>/skins.ts`. Añadir una skin obliga a definirla en todos los juegos, igual que `ENGINES` / `GAME_META`.
- **Sí:** `SkinColor` con `{ cssVar, fallback }`. `neon` sigue leyendo `:root` como el `readPalette()` actual, y `clasico` / `retro` quedan independientes del tema.
- **Sí:** `hasSkins` en `GameMeta` como interruptor por juego. Permite implementar las skins juego a juego sin mostrar un selector que no hace nada.
- **No:** obligar a migrar los 4 juegos en esta spec. La convertiría en una spec enorme; cada juego lleva sus paletas en su propia spec.
- **Sí:** `setSkin` no-op en los motores sin skins. El contrato queda completo desde el principio y el player no tiene que comprobar si el método existe.
- **Sí:** persistencia por juego en `localStorage` con clave versionada `av:skin:v1:<gameId>`. Cada juego tiene un original distinto y el jugador puede preferir looks distintos.
- **No:** skin global. Un `retro` verde puede encajar en Asteroids y no en Tetris.
- **No:** Supabase. No hace falta para algo cosmético y añadiría migración, RLS y latencia.
- **Sí:** `try/catch` y `Map` en memoria. El modo privado o la cuota llena no rompen el player.
- **Sí:** `useSyncExternalStore` con snapshot de servidor `null`. Mismo patrón que `useIsTouch`, sin `setState` en efectos y sin avisos de hidratación.
- **Sí:** selector en `.crt-bottom` en lugar de `CARGA · 1MB`. Ese texto es decorativo y el selector se lee como un mando del monitor, sin añadir otra barra.
- **No:** selector en `.player-hud`. Ya tiene Jugador, estadísticas y tres botones, y en pantallas estrechas se parte.
- **Sí:** `blur()` tras pulsar un botón del selector. Si el botón conserva el foco, Espacio (disparo en Asteroids, caída en Tetris) lo vuelve a pulsar.
- **No:** atajo de teclado para la skin. Choca con los controles de algún juego y no aporta para una elección que se hace una vez.
- **No:** skin en HUD, overlays y modal. Son de la plataforma, comparten estilos con el resto de pantallas y cambiarlos por juego duplicaría CSS.
- **Sí:** `clasico` por defecto. Es el requisito de la plataforma, aunque cambie lo que ve hoy el jugador (neón) en cuanto cada juego active sus skins.

---

## Riesgos

| Riesgo                                                                 | Mitigación                                                                                                                 |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Pasar de neón a `clasico` por defecto sorprende a quien ya jugaba      | El selector está siempre visible en la CRT y la elección se recuerda por juego. Se anota en la spec de cada juego.         |
| El botón del selector conserva el foco y Espacio lo vuelve a pulsar    | `blur()` tras cada clic. Los motores ya hacen `preventDefault` de Espacio en `ready`, `playing` y `paused`.                |
| `localStorage` no disponible o con valores manipulados                 | `try/catch`, `isSkinId` y `DEFAULT_SKIN`. Un valor no válido se trata como si no existiera.                                |
| Desajuste de hidratación al leer `localStorage` en el render           | Snapshot de servidor `null` y selector oculto hasta tener valor. El motor se crea en un efecto, que solo corre en cliente. |
| Un cambio de skin recrea el motor por una dependencia mal puesta       | El efecto de creación depende solo de `isTouch` y `game.id`. Criterio de aceptación en cada spec de juego.                 |
| Alguien usa la skin para ganar ventaja (por ejemplo, fondo que oculta) | Cada spec de juego exige contraste ≥ 3:1 de todo elemento jugable contra el fondo y no toca hitboxes ni velocidades.       |

---

## Lo que **no** entra en esta spec

- Paletas de cualquier juego.
- Skins guardadas en Supabase o por usuario.
- Skins de pago o desbloqueables.
- Skins para HUD, overlays, modal, portadas o carcasa de la CRT.
- Atajo de teclado o skin global.
- Marca de skin en el leaderboard.

Cada uno de estos puntos, si llega, va en su propia spec.

> Para implementarla, se mueve a `specs/NN-<slug>.md` (siguiente número libre), pasa a `Aprobado` y se ejecuta `/spec-impl NN-<slug>`. La de plataforma va primero.

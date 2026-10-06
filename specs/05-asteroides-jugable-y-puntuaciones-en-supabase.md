# SPEC 05 — Asteroides jugable en ROCAS y guardado de puntuaciones en Supabase

> **Estado:** Implementado 
> **Depende de:** SPEC 01, SPEC 02, SPEC 04
> **Fecha:** 2026-10-05
> **Objetivo:** Portar el Asteroids de `references/started-games/02-asteroids/` como motor TypeScript jugable en `/games/rocas/play` y guardar automáticamente en una tabla `scores` de Supabase la puntuación de los usuarios con sesión.

---

## Por qué existe esta spec

Desde SPEC 01, `/games/[id]/play` es un simulacro: `GamePlayer` sube la puntuación sola con un `setInterval` y el modal guarda las iniciales en `localStorage` (`av_scores`), aunque nadie lo lee.
Ya existe un Asteroids completo (`game.js`, canvas 800×600, sin dependencias), pero usa variables globales, escucha el teclado en `window` y pinta su propio HUD y su propio game over.
SPEC 04 dejó usuarios reales con `profiles`, así que las puntuaciones ya pueden ir a Supabase.
Esta spec convierte el juego en un motor que la plataforma puede montar, desmontar y escuchar, crea el primer registro de motores (que luego usarán Tetris y Arkanoid) y estrena la tabla `scores`, solo para escribir.

---

## Alcance

**Dentro:**

- **Motor de Asteroids en TypeScript**, sin React, en `lib/engines/asteroids/`:
  - Port 1:1 de `game.js`: mismas constantes (velocidades, radios, `DRAG`, puntos 20/50/100, 3 vidas, 3 s de invencibilidad, `dt` limitado a 50 ms), mismo envolvimiento toroidal y mismo power-up de triple disparo (5 s, probabilidad 15 %, garantizado a las 5 destrucciones, uno por nivel).
  - La lógica sigue en coordenadas fijas 800×600. El canvas se escala con CSS a la pantalla `.crt-screen` (4:3) y su buffer se multiplica por `devicePixelRatio` para que se vea nítido.
  - Estética neón: nave `--cyan`, asteroides `--magenta`, balas `--yellow`, power-up `--green`, partículas del color de lo que explota, llama del propulsor `--yellow`. Glow con `shadowBlur`. Los colores se leen de `:root` al crear el motor, con fallback a los hex actuales.
  - Del HUD original en el canvas solo queda el indicador `3x  N.Ns` mientras dura el power-up. Puntuación, vidas y nivel salen por callback.
  - El canvas no dibuja el game over: lo muestra el modal de la plataforma.
- **Contrato común de motores** (`lib/engines/types.ts`) y registro `id → motor` (`lib/engines/index.ts`), con `rocas` como único juego jugable.
- **Fases de la partida** (`ready → playing ⇄ paused → over`):
  - `ready`: overlay en la CRT "PULSA ESPACIO PARA EMPEZAR" con la tabla de controles. Espacio empieza.
  - `paused`: con P, Esc o el botón PAUSA. También se pausa sola al perder el foco la ventana (`blur`) o al ocultarse la pestaña (`visibilitychange`). Se reanuda con P, Esc o REANUDAR (nunca sola).
  - `over`: al perder la última vida o al pulsar FIN.
  - Mientras la fase es `ready`, `playing` o `paused`, flechas y Espacio hacen `preventDefault` (no hacen scroll). En `over` no se captura ninguna tecla.
- **Controles:** `←` `→` rotar, `↑` propulsar, `Espacio` disparar, `P` / `Esc` pausa. Sin WASD.
- **Jugador con motor** (`components/engine-player.tsx`):
  - HUD React existente (`.player-hud`): Jugador (`user.name` o `INVITADO`), Puntuación, Vidas (`♥`) y Nivel, alimentados por `onStats`.
  - Botones PAUSA/REANUDAR (deshabilitado en `ready` y `over`), FIN (termina la partida) y SALIR.
  - En dispositivos táctiles sin teclado (`(hover: none) and (pointer: coarse)`), en vez de arrancar el motor se muestra el overlay "REQUIERE TECLADO".
- **Modal de fin** para juegos con motor: "FIN DEL JUEGO", PUNTUACIÓN FINAL, NIVEL alcanzado, estado de guardado y los botones JUGAR DE NUEVO (reinicia directamente en `playing`) y VOLVER AL VAULT.
- **Guardado automático** al entrar en `over`, una sola vez por partida:
  - Con sesión y `score > 0`: llama a la Server Action `saveScore`. Estados: `▸ GUARDANDO…`, `▸ PUNTUACIÓN GUARDADA_`, y en caso de error, línea magenta + botón REINTENTAR.
  - Con sesión y `score = 0`: `▸ SIN PUNTOS QUE GUARDAR`. No se llama a la acción.
  - Sin sesión (o si la acción responde `unauthenticated`): `▸ INICIA SESIÓN PARA GUARDAR TUS PUNTUACIONES` y botón "INICIAR SESIÓN" a `/login`.
- **Tabla `public.scores`** con migración versionada, RLS (lectura pública; insert solo `authenticated` con `user_id = auth.uid()`; sin update ni delete), índices y tipos regenerados.
- **Server Action** `saveScore` en `app/games/[id]/play/actions.ts`, con validación básica compartida (`lib/scores.ts`) en servidor y `CHECK` en la base de datos.
- **Juegos sin motor (los otros 7):** siguen con el simulacro actual en `GamePlayer`, pero su modal ya no guarda nada. Desaparecen el input de iniciales y "GUARDAR PUNTUACIÓN", y en su lugar aparece `▸ MODO DEMO · PUNTUACIÓN NO GUARDADA`. Se elimina todo el código de `localStorage` (`av_scores`).
- `app/games/[id]/play/page.tsx` elige entre `EnginePlayer` y `GamePlayer` según el registro.
- CSS nuevo en `app/globals.css` para el canvas, los overlays de la CRT y los estados de guardado del modal (diseñado con `/frontend-design`).

**Fuera de alcance (para futuras specs):**

- Leer puntuaciones de Supabase: el leaderboard de `/games/[id]`, el Salón de la Fama, el campo `best` y el "récord personal" siguen siendo mock.
- Antitrampas real (tokens de partida, duración mínima, puntos por segundo). Un usuario con DevTools puede enviar una puntuación falsa válida.
- Guardar puntuaciones de invitados (ni en Supabase ni en local).
- Controles táctiles y jugabilidad en móvil.
- Sonido, OVNIs, hiperespacio y cualquier mejora sobre `game.js`.
- WASD u otras teclas configurables.
- Motores de Tetris y Arkanoid (solo se deja preparado el registro).
- Cambiar textos, portada o datos de ROCAS en el catálogo (`lib/games.ts`).
- Framework de tests.

---

## Modelo de datos

### Base de datos (`supabase/migrations/<timestamp>_create_scores.sql`)

```sql
create table public.scores (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  game_id    text not null check (game_id ~ '^[a-z0-9-]{1,32}$'),
  score      integer not null
             check (score between 1 and 10000000 and score % 10 = 0),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_user_id_idx on public.scores (user_id);

alter table public.scores enable row level security;

create policy "scores are readable by everyone"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "users insert their own scores"
  on public.scores for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Sin políticas de update/delete: una puntuación no se edita.
```

`user_id` apunta a `profiles` (no a `auth.users`) para que la futura spec de leaderboards pueda hacer el join con `username` directamente. La BD no conoce la lista de juegos: comprueba solo el formato de `game_id`, y la lista de juegos jugables la valida la Server Action.

### Contrato de motores (`lib/engines/types.ts`)

```ts
export type GamePhase = "ready" | "playing" | "paused" | "over";

export interface GameStats {
  score: number;
  lives: number;
  level: number;
}

export interface GameCallbacks {
  onStats(stats: GameStats): void; // solo cuando cambia algún valor
  onPhase(phase: GamePhase): void;
}

export interface GameInstance {
  pause(): void; // playing → paused
  resume(): void; // paused → playing
  end(): void; // ready | playing | paused → over (botón FIN)
  restart(): void; // cualquier fase → playing, partida nueva
  destroy(): void; // cancela el rAF y quita todos los listeners
}

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameInstance;
```

La fase interna `dead` del original (los 2 s antes de reaparecer) sigue existiendo dentro del motor, pero hacia fuera cuenta como `playing`.

### Registro

`lib/engines/ids.ts` (sin dependencias de navegador, importable desde el servidor):

```ts
export const PLAYABLE_GAME_IDS = ["rocas"] as const;
export type PlayableGameId = (typeof PLAYABLE_GAME_IDS)[number];
export function isPlayable(id: string): id is PlayableGameId;
```

`lib/engines/index.ts` (solo cliente):

```ts
export const ENGINES: Record<PlayableGameId, GameFactory> = {
  rocas: createAsteroidsGame,
};
```

El tipo `Record<PlayableGameId, …>` obliga a que la lista de ids y el registro estén siempre sincronizados.

### Archivos del motor

- `lib/engines/asteroids/entities.ts`: `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle`, con las mismas constantes que `game.js`. Reciben `ctx` y la paleta en `draw()` en lugar de usar globales.
- `lib/engines/asteroids/engine.ts`: `createAsteroidsGame: GameFactory`. Contiene el estado, el input (`keys` / `justPressed` por instancia), el bucle `requestAnimationFrame`, las colisiones, los niveles y el render.

### Puntuaciones (`lib/scores.ts`, se reescribe; importable desde cliente y servidor)

```ts
export const SCORE_LIMITS = { min: 1, max: 10_000_000, step: 10 } as const;

export interface SaveScoreInput {
  gameId: string;
  score: number;
}

export type SaveScoreErrorCode = "unauthenticated" | "invalid" | "unknown";

export type SaveScoreResult =
  { status: "ok" } | { status: "error"; code: SaveScoreErrorCode };

// null si gameId no es jugable o score no es entero, múltiplo de 10 y dentro de límites
export function validateScore(input: SaveScoreInput): SaveScoreInput | null;
```

### Server Action (`app/games/[id]/play/actions.ts`)

```ts
"use server";
export async function saveScore(
  input: SaveScoreInput,
): Promise<SaveScoreResult>;
```

Se llama directamente desde el cliente (no es un `<form>`). Usa `createClient()` de `lib/supabase/server.ts` con la sesión del usuario (nunca una clave secreta), obtiene `user_id` de `auth.getUser()` y nunca del cliente, e inserta `{ user_id, game_id, score }`.

### Mapeo de estados del guardado

| Situación                                    | Texto en el modal                               | Acción         |
| -------------------------------------------- | ----------------------------------------------- | -------------- |
| Guardando                                    | `▸ GUARDANDO…`                                  | —              |
| `ok`                                         | `▸ PUNTUACIÓN GUARDADA_`                        | —              |
| Sin sesión en el cliente o `unauthenticated` | `▸ INICIA SESIÓN PARA GUARDAR TUS PUNTUACIONES` | INICIAR SESIÓN |
| `score = 0`                                  | `▸ SIN PUNTOS QUE GUARDAR`                      | —              |
| `invalid`                                    | `> PUNTUACIÓN NO VÁLIDA.` (magenta)             | —              |
| `unknown` (red, BD, variables de entorno)    | `> ERROR AL GUARDAR.` (magenta)                 | REINTENTAR     |
| Juego sin motor (mock)                       | `▸ MODO DEMO · PUNTUACIÓN NO GUARDADA`          | —              |

Los casos `unknown` se registran en el servidor con `console.error`. El usuario nunca ve mensajes internos de Supabase.

---

## Plan de implementación

1. **Migración `scores`.**
   - Crear `supabase/migrations/<timestamp>_create_scores.sql` con el SQL del modelo de datos y aplicarlo con `npx supabase db push`.
   - `npm run db:types` para regenerar `lib/supabase/database.types.ts`.
   - Verificar con el MCP: `list_tables` muestra `scores` con RLS activado y `get_advisors` (security y performance) no muestra avisos sobre `scores`.
2. **Validación e ids jugables.**
   - Crear `lib/engines/ids.ts` (`PLAYABLE_GAME_IDS`, `isPlayable`).
   - Reescribir `lib/scores.ts` con `SCORE_LIMITS`, los tipos y `validateScore`, eliminando `saveScore` de `localStorage` y la clave `av_scores`.
   - En `components/game-player.tsx`, quitar el input de iniciales, el botón GUARDAR PUNTUACIÓN y el estado `saved`/`editedName`, y mostrar `▸ MODO DEMO · PUNTUACIÓN NO GUARDADA`.
   - Verificar: `npm run build` pasa y los juegos mock siguen funcionando.
3. **Server Action.** Consultar antes `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`. Crear `app/games/[id]/play/actions.ts` con `saveScore`:
   - Valida con `validateScore` (→ `invalid`).
   - `auth.getUser()` sin usuario → `unauthenticated`.
   - Inserta en `scores`. Cualquier error → `console.error` + `unknown`.
4. **Contrato y motor.**
   - Crear `lib/engines/types.ts`.
   - Portar `game.js` a `lib/engines/asteroids/entities.ts` y `engine.ts`:
     - Estado e input por instancia; listeners de `keydown`/`keyup` en `window`, `blur` en `window` y `visibilitychange` en `document`, todos eliminados en `destroy()`.
     - Fases `ready/playing/paused/over` notificadas con `onPhase`. Espacio en `ready` empieza. P/Esc alternan pausa. Pausa automática en `blur`/pestaña oculta. Al reanudar se reinicia `lastTime` para que no haya salto de `dt`.
     - `onStats` cuando cambian `score`, `lives` o `level`.
     - Paleta neón leída de `:root` con `getComputedStyle` (fallback a los hex). Glow con `shadowBlur`.
     - Canvas con `width = 800 * dpr` y `height = 600 * dpr`, más `ctx.setTransform(dpr, …)`.
     - Se eliminan `drawHUD` (salvo el indicador `3x`) y `drawOverlay`, y Espacio ya no reinicia en `over`.
   - Crear `lib/engines/index.ts` con `ENGINES`.
5. **Jugador con motor.** Ejecutar `/frontend-design` para los overlays de la CRT (inicio con controles, pausa, "REQUIERE TECLADO") y los estados de guardado del modal, siguiendo el estilo existente (`.crt-content`, `.modal`, `.toast-saved`, `.auth-error`). Crear `components/engine-player.tsx`:
   - Monta `<canvas className="game-canvas">` dentro de `.crt-screen` y crea la instancia en un `useEffect` con `destroy()` en el cleanup (seguro con el doble montaje de Strict Mode).
   - Detecta táctil con `matchMedia` después del montaje: si es táctil, no crea la instancia y muestra "REQUIERE TECLADO".
   - HUD, botones PAUSA/REANUDAR, FIN y SALIR. Modal de fin con PUNTUACIÓN FINAL y NIVEL.
   - Al pasar a `over`, guarda una vez por partida (con un id de partida que incrementa `restart()`) con `useTransition` + `saveScore`, según la tabla de estados. REINTENTAR repite la llamada. JUGAR DE NUEVO llama a `restart()` y limpia el estado de guardado.
   - Añadir a `globals.css` las reglas `.game-canvas` (`display:block; width:100%; height:100%`), los overlays y `.save-status` (variantes ok/error).
6. **Ruta.** En `app/games/[id]/play/page.tsx`, renderizar `<EnginePlayer game={game} />` si `isPlayable(id)`, y `<GamePlayer game={game} />` en otro caso.
7. **Cierre.**
   - Jugar una partida completa en `/games/rocas/play` como invitado y otra con sesión.
   - Comprobar con el MCP (`execute_sql`) la fila insertada en `scores`.
   - Recorrer los criterios de aceptación.
   - `npm run lint` y `npm run build` pasan.

---

## Criterios de aceptación

- [x] `npm run build` termina sin errores ni warnings de tipos.
- [x] `npm run lint` termina sin errores.
- [x] La consola del navegador no muestra errores ni avisos de hidratación en `/games/rocas/play` ni en `/games/caida/play`.
- [x] `supabase/migrations/` contiene la migración de `scores` y `list_tables` (MCP) muestra `public.scores` con RLS activado.
- [x] `get_advisors` (security y performance) no muestra avisos sobre `scores`.
- [x] `lib/supabase/database.types.ts` incluye la tabla `scores`.
- [x] `/games/rocas/play` muestra el canvas dentro de la CRT con el overlay "PULSA ESPACIO PARA EMPEZAR" y los controles. El juego no avanza hasta pulsar Espacio.
- [x] Nave cian, asteroides magenta, balas amarillas y power-up verde, con glow, nítidos en una pantalla con `devicePixelRatio` 2.
- [x] Destruir un asteroide grande, uno mediano y uno pequeño suma 20, 50 y 100 en el HUD React. Los grandes se parten en 2 medianos y los medianos en 2 pequeños.
- [x] Al chocar se pierde una vida (el HUD baja un `♥`), la nave reaparece en el centro parpadeando y es invencible unos 3 s.
- [x] Al vaciar el campo el HUD pasa a NIVEL 02 y aparecen 5 asteroides grandes.
- [x] Recoger el power-up muestra `3x  N.Ns` en el canvas y dispara 3 balas durante 5 s.
- [x] El canvas no dibuja SCORE, NIVEL ni vidas; tampoco el texto GAME OVER.
- [x] Flechas y Espacio no hacen scroll de la página durante la partida.
- [x] P, Esc y el botón PAUSA pausan y reanudan. Cambiar de pestaña o hacer clic fuera de la ventana pausa la partida y no se reanuda sola.
- [x] Perder la última vida abre el modal con PUNTUACIÓN FINAL y NIVEL.
- [x] Con sesión, el modal pasa de `▸ GUARDANDO…` a `▸ PUNTUACIÓN GUARDADA_`, y `select * from scores order by id desc limit 1` devuelve el `user_id` del usuario, `game_id = 'rocas'` y la misma puntuación.
- [x] Una partida produce una sola fila en `scores` (también con Strict Mode en desarrollo).
- [x] Pulsar FIN a mitad de partida con sesión y puntos abre el modal y guarda esa puntuación.
- [x] Pulsar FIN con 0 puntos muestra `▸ SIN PUNTOS QUE GUARDAR` y no inserta nada.
- [x] Sin sesión, el modal muestra `▸ INICIA SESIÓN PARA GUARDAR TUS PUNTUACIONES` con un botón a `/login`, y no se inserta nada.
- [x] Sin `NEXT_PUBLIC_SUPABASE_URL` en el entorno, el modal muestra `> ERROR AL GUARDAR.` con REINTENTAR, y el servidor registra el error.
- [x] Llamar a `saveScore({ gameId: "rocas", score: 15 })` o `saveScore({ gameId: "caida", score: 100 })` devuelve `invalid` y no inserta nada.
- [x] Un `insert` directo en `scores` con la publishable key y sin sesión, o con un `user_id` ajeno, es rechazado por RLS.
- [x] JUGAR DE NUEVO empieza una partida nueva directamente (score 0, 3 vidas, nivel 01).
- [x] SALIR y VOLVER AL VAULT desmontan el juego: tras navegar, las flechas vuelven a hacer scroll y no queda ningún `requestAnimationFrame` activo.
- [x] Emulando un dispositivo táctil en DevTools, `/games/rocas/play` muestra "REQUIERE TECLADO" y no arranca el motor.
- [x] `/games/caida/play` (mock) sigue funcionando y su modal muestra `▸ MODO DEMO · PUNTUACIÓN NO GUARDADA`, sin input de iniciales.
- [x] `grep -r "av_scores\|localStorage" components lib app` no devuelve resultados relacionados con puntuaciones.

---

## Decisiones

- **Sí:** reusar la entrada `rocas` del catálogo. Ya describe este juego (SHOOTER, portada `cover-rocas`) y se mantiene la URL `/games/rocas`.
- **No:** renombrar a "asteroides" ni crear una tarjeta nueva.
- **Sí:** motor TypeScript sin React con contrato `GameFactory` y registro. React solo monta el canvas y escucha callbacks; Tetris y Arkanoid podrán seguir el mismo contrato.
- **No:** meter el juego en un componente React con refs ni cargar `game.js` en `public/` con `<Script>` (globals, sin tipos y sin forma limpia de hablar con el HUD).
- **Sí:** carpeta `lib/engines/` y no `lib/games/`. `lib/games.ts` ya existe, y una carpeta con el mismo nombre haría ambiguo el import `@/lib/games`.
- **Sí:** `lib/engines/ids.ts` separado del registro. El servidor valida `game_id` sin importar código de canvas, y el `Record<PlayableGameId, GameFactory>` mantiene ambos sincronizados.
- **Sí:** jugabilidad 1:1 con `game.js`, incluido el triple disparo. El juego ya está afinado; esta spec es de integración, no de diseño de juego.
- **Sí:** recolorear a neón con la paleta de `:root`. Encaja con el resto de la plataforma sin tocar formas ni física.
- **Sí:** HUD en React (`.player-hud`) y game over en el modal de la plataforma. Una sola fuente visual de verdad. En el canvas solo queda el indicador `3x`, que no tiene equivalente en el HUD.
- **Sí:** pantalla de inicio y pausa automática al perder el foco. Evita que la partida empiece o siga sin que el jugador mire, algo que el original no necesitaba al ocupar toda la página.
- **Sí:** el botón FIN termina la partida y guarda. Es el mismo camino que el game over.
- **Sí:** guardar en Supabase en esta spec, pero solo escribir. Leer (leaderboards, Salón de la Fama, récord personal) es otra área con sus propias decisiones de ranking y va en otra spec.
- **Sí:** tabla `scores` genérica (`game_id` + `score`) con FK a `profiles`. Sirve para todos los juegos futuros y deja listo el join con `username`.
- **No:** una tabla por juego ni una columna `level`.
- **Sí:** guardado automático al game over con el `username` del perfil. Sin sesión no hay nombre que escribir, así que el input de iniciales sobra.
- **Sí:** los invitados no guardan y se les invita a iniciar sesión. Insertar como `anon` abriría la tabla al spam.
- **Sí:** validación básica (entero, 1..10.000.000, múltiplo de 10, juego jugable) en servidor y `CHECK` en la BD. Todas las puntuaciones de Asteroids son múltiplos de 10. Se acepta que con DevTools se pueda falsear una puntuación válida; el antitrampas real va en otra spec.
- **Sí:** Server Action con la sesión del usuario y RLS `with check (auth.uid() = user_id)`. Es el mismo patrón que SPEC 04 y nunca hace falta una clave secreta.
- **No:** insertar desde el cliente con el SDK del navegador. Funcionaría con RLS, pero la validación compartida se saltaría.
- **Sí:** quitar `localStorage` (`av_scores`) también de los juegos mock. Nadie lo leía, y mantener dos caminos de guardado confundiría. Los mocks muestran que son una demo.
- **Sí:** aviso "REQUIERE TECLADO" en táctil. Los controles táctiles son su propia spec.
- **Sí:** verificación con `build` + `lint` + checklist manual + comprobaciones por MCP. Sigue sin framework de tests.

---

## Riesgos

| Riesgo                                                                                     | Mitigación                                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta dos veces el efecto: dos bucles rAF, listeners duplicados o doble insert | `destroy()` cancela el rAF y quita todos los listeners. El guardado va ligado a un id de partida y solo se dispara una vez por id. Hay criterio de aceptación. |
| `shadowBlur` con muchas partículas baja los FPS                                            | Aplicar el glow por grupo de entidades (no por partícula) o reducir el blur de las partículas. Comprobarlo en el nivel 3+ con muchas explosiones.              |
| Teclas capturadas fuera del juego (inputs del Nav, botones del modal)                      | `preventDefault` solo en `ready/playing/paused` y solo para flechas y Espacio. En `over` no se captura nada. Al desmontar se quitan los listeners.             |
| La pausa automática por `blur` se dispara al pulsar los botones del HUD                    | Los botones están en el mismo documento: `blur` de `window` solo salta al salir de la ventana. Verificarlo en el criterio de pausa.                            |
| Puntuaciones falsas enviadas desde DevTools                                                | Aceptado para esta spec. `CHECK` y validación acotan el daño, la RLS impide escribir a nombre de otro, y el antitrampas queda anotado como spec futura.        |
| La sesión caduca durante la partida                                                        | La acción responde `unauthenticated` y el modal muestra la invitación a iniciar sesión en lugar de un error genérico.                                          |
| Los colores CSS no están disponibles al crear el motor                                     | Fallback a los hex actuales de `:root`.                                                                                                                        |
| API de Server Actions llamadas fuera de formularios distinta en Next 16                    | Leer `07-mutating-data.md` antes del paso 3.                                                                                                                   |

---

## Lo que **no** entra en esta spec

- Leaderboards, Salón de la Fama y récord personal con datos reales.
- Antitrampas real.
- Puntuaciones de invitados.
- Controles táctiles.
- Sonido y mejoras sobre el juego original.
- Motores de Tetris y Arkanoid.
- Tests automáticos.

Cada uno de estos puntos, si llega, va en su propia spec.

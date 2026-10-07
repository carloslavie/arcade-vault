# SPEC 07 — Estadísticas reales de cada juego (partidas, mejor global y dificultad)

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-10-07
> **Objetivo:** Sustituir los valores mock de Partidas, Mejor global y Dificultad del detalle `/games/[id]` (y de MEJOR PUNTUACIÓN en las tarjetas de `/games`) por datos reales leídos de Supabase.

---

## Por qué existe esta spec

SPEC 06 dejó el leaderboard del detalle leyendo `scores`, pero el `stat-strip` que está justo encima sigue saliendo de `GAME_MOCK_STATS`: ROCAS muestra «15.6K» partidas y «41.200» de mejor global aunque la BD diga otra cosa, y la dificultad es `★ ★ ★ ☆ ☆` fija para todos los juegos.
Las tarjetas de la biblioteca muestran el mismo «mejor» mock, así que la tarjeta y el leaderboard del detalle pueden contradecirse.
Esta spec hace que esos tres recuadros y la MEJOR PUNTUACIÓN de las tarjetas reflejen la BD, y elimina `GAME_MOCK_STATS`.

---

## Alcance

**Dentro:**

- **Columna `games.difficulty`** (`smallint`, 1–5, `not null`) con migración versionada que la siembra para los 8 juegos.
- **Función RPC `public.get_game_stats(p_game_id text default null)`**: devuelve `(game_id, plays, best)` por juego. `plays` = número de filas de `scores` del juego; `best` = máxima puntuación (`null` si no hay ninguna). Con `p_game_id = null` devuelve los 8 juegos; con un id, solo ese. `left join` desde `games` para que los juegos sin partidas aparezcan con `plays = 0`. `security invoker`, `stable`, `search_path = ''`.
- **Tipos regenerados** (`npm run db:types`).
- **`Game` gana `difficulty: number`**; `lib/catalog.ts` lo selecciona y lo mapea.
- **Capa de lectura en servidor** `lib/game-stats.ts`: `getAllGameStats()` y `getGameStats(id)`. No lanzan: si Supabase falla devuelven `null` y registran con `console.error` (mismo patrón que `getLeaderboard`).
- **Formateadores apto-cliente en `lib/games.ts`:** `formatPlays`, `formatBest`, `difficultyStars`.
- **Detalle `/games/[id]`:** `stat-strip` con Partidas y Mejor global reales y Dificultad desde `game.difficulty`.
- **Biblioteca `/games`:** `GameCard` muestra la mejor marca real en MEJOR PUNTUACIÓN. Las estadísticas llegan por props desde la página (`Library` es cliente).
- **Estados:**
  - Juego sin partidas: Partidas `0`, Mejor global `—`, tarjeta `—`.
  - Error al leer estadísticas: Partidas `—`, Mejor global `—`, tarjeta `—`; la dificultad se sigue viendo (viene de `games`) y el resto de la página se renderiza normal.
- **Se eliminan** `GameMockStats`, `GAME_MOCK_STATS` y `mockStats` de `lib/games.ts`.
- Sin CSS nuevo: se reutilizan `.stat-strip` y `.score-badge`. Si hiciera falta algún ajuste visual, se diseña con `/frontend-design`.

**Fuera de alcance (para futuras specs):**

- Contar partidas de invitados o partidas sin guardar (requiere una tabla de partidas propia).
- Salón de la Fama con datos reales.
- Landing con datos reales (ticker, TOP JUGADORES · HOY, stats «MILES DE PARTIDAS»).
- Editar la dificultad desde la app (solo por migración).
- Las etiquetas fijas del detalle (`1 JUGADOR`, `TECLADO / TÁCTIL`, `RETRO 1985`).
- Caché, revalidación o contadores materializados.
- Tests automáticos.

---

## Modelo de datos

### Migración 1 — `supabase/migrations/<timestamp>_add_games_difficulty.sql`

```sql
alter table public.games add column difficulty smallint;

update public.games set difficulty = case id
  when 'bloque-buster' then 2
  when 'caida'         then 3
  when 'serpentina'    then 2
  when 'gloton'        then 3
  when 'invasores'     then 3
  when 'rocas'         then 4
  when 'ranaria'       then 3
  when 'duelo-pixel'   then 4
end;

alter table public.games
  alter column difficulty set not null,
  add constraint games_difficulty_check check (difficulty between 1 and 5);
```

La columna se crea nullable, se rellena y después pasa a `not null`, para que la migración no falle con las filas existentes.

### Migración 2 — `supabase/migrations/<timestamp>_create_get_game_stats.sql`

```sql
create function public.get_game_stats(p_game_id text default null)
returns table (game_id text, plays bigint, best integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    g.id        as game_id,
    count(s.id) as plays,
    max(s.score) as best
  from public.games g
  left join public.scores s on s.game_id = g.id
  where p_game_id is null or g.id = p_game_id
  group by g.id
  order by g.sort_order;
$$;
```

`security invoker`: respeta la RLS de `games` y `scores`, ambas de lectura pública. El índice `scores_game_score_idx (game_id, score desc)` de SPEC 05 cubre el join por juego.

### Tipos (`lib/games.ts`, apto para cliente y servidor)

```ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: NeonColor;
  difficulty: number; // 1–5
}

export interface GameStats {
  plays: number;
  best: number | null; // null = nadie ha puntuado aún
}

// < 10.000 → exacto es-ES ("9.870"); < 1.000.000 → "15,6K"; resto → "1,2M".
// Un decimal truncado (no redondeado) y sin ",0" final ("12K"). null → "—".
export function formatPlays(plays: number | null | undefined): string;

// es-ES ("41.200"); null/undefined → "—".
export function formatBest(best: number | null | undefined): string;

// 4 → "★ ★ ★ ★ ☆"
export function difficultyStars(difficulty: number): string;

// Se eliminan: GameMockStats, GAME_MOCK_STATS, mockStats
```

### Estadísticas (`lib/game-stats.ts`, solo servidor)

```ts
// Por id de juego. null si Supabase falla (se registra con console.error).
export async function getAllGameStats(): Promise<Record<
  string,
  GameStats
> | null>;

// null si Supabase falla o el juego no existe.
export async function getGameStats(gameId: string): Promise<GameStats | null>;
```

Llaman a `supabase.rpc("get_game_stats", …)` con `createClient()` de `lib/supabase/server.ts`, con `unstable_rethrow` en el `catch` igual que `getLeaderboard`. Convierten `plays` a `number` y tratan `best` como posible `null`.

### Componentes

```ts
// components/library.tsx
export function Library(props: {
  games: Game[];
  stats: Record<string, GameStats> | null;
}): JSX.Element;

// components/game-card.tsx — best: undefined/null → "—"
export function GameCard(props: {
  game: Game;
  best: number | null | undefined;
  onSelect: (game: Game) => void;
}): JSX.Element;
```

| Situación             | Partidas             | Mejor global       | Dificultad             | Tarjeta (MEJOR PUNTUACIÓN) |
| --------------------- | -------------------- | ------------------ | ---------------------- | -------------------------- |
| Con partidas          | `formatPlays(plays)` | `formatBest(best)` | `difficultyStars(...)` | `formatBest(best)`         |
| Sin partidas          | `0`                  | `—`                | `difficultyStars(...)` | `—`                        |
| Error en estadísticas | `—`                  | `—`                | `difficultyStars(...)` | `—`                        |

---

## Plan de implementación

1. **Migración `difficulty`.**
   - Crear `supabase/migrations/<timestamp>_add_games_difficulty.sql` y aplicarla con `npx supabase db push`.
   - Verificar con el MCP (`execute_sql`): `select id, difficulty from games order by sort_order` devuelve los 8 valores del seed; un `update games set difficulty = 6` falla por el `CHECK`.
2. **Migración `get_game_stats`.**
   - Crear `supabase/migrations/<timestamp>_create_get_game_stats.sql` y aplicarla.
   - `npm run db:types`.
   - Verificar con `execute_sql`: `select * from get_game_stats()` devuelve 8 filas; `rocas` coincide con `select count(*), max(score) from scores where game_id = 'rocas'`; `caida` devuelve `plays = 0`, `best = null`. `get_advisors` (security y performance) sin avisos sobre `get_game_stats`.
3. **Tipos y lectura.**
   - `lib/games.ts`: añadir `difficulty` a `Game`, `GameStats`, `formatPlays`, `formatBest`, `difficultyStars`; eliminar `GameMockStats`, `GAME_MOCK_STATS` y `mockStats`.
   - `lib/catalog.ts`: añadir `difficulty` a `COLUMNS` y a `toGame`.
   - Crear `lib/game-stats.ts` (`getAllGameStats`, `getGameStats`).
   - Este paso deja el build roto hasta el paso 4; se hacen juntos antes de verificar.
4. **Pantallas.**
   - `app/games/[id]/page.tsx`: `getGame`, `getLeaderboard` y `getGameStats` en paralelo (`Promise.all`); `stat-strip` con `formatPlays`, `formatBest` y `difficultyStars(game.difficulty)` (con `aria-label="Dificultad N de 5"`).
   - `app/games/page.tsx`: `getGames()` y `getAllGameStats()` en paralelo; pasar `stats` a `Library`.
   - `components/library.tsx`: aceptar `stats` y pasar `best={stats?.[g.id]?.best}` a `GameCard`.
   - `components/game-card.tsx`: usar la prop `best` con `formatBest`.
   - Verificar: `npm run build` pasa; `/games` y `/games/rocas` muestran los datos de la BD.
5. **Cierre.**
   - Jugar una partida con sesión en ROCAS y comprobar que Partidas sube en 1 al recargar `/games/rocas` (y Mejor global cambia si es nueva marca, también en la tarjeta de `/games`).
   - Recorrer los criterios de aceptación.
   - `npm run lint` y `npm run build` pasan.

---

## Criterios de aceptación

- [x] `npm run build` termina sin errores ni warnings de tipos.
- [x] `npm run lint` termina sin errores.
- [x] La consola del navegador no muestra errores ni avisos de hidratación en `/games` y `/games/rocas`.
- [x] `supabase/migrations/` contiene las dos migraciones nuevas y `lib/supabase/database.types.ts` incluye `games.difficulty` y la función `get_game_stats`.
- [x] `get_advisors` (security y performance) no muestra avisos sobre `get_game_stats` ni `games`.
- [x] Un `update games set difficulty = 0` y otro con `6` (vía `execute_sql`) fallan por el `CHECK`.
- [x] `grep -rn "mockStats\|GAME_MOCK_STATS" app components lib` no devuelve resultados.
- [x] En `/games/rocas`, Partidas coincide con `select count(*) from scores where game_id = 'rocas'` (formateado según `formatPlays`) y Mejor global con `max(score)` en formato `es-ES`.
- [x] En `/games/rocas` la dificultad muestra `★ ★ ★ ★ ☆`; en `/games/bloque-buster`, `★ ★ ☆ ☆ ☆`.
- [x] Cambiar `difficulty` de un juego con `execute_sql` se refleja en su detalle al recargar (después se revierte).
- [x] `/games/caida` muestra Partidas `0` y Mejor global `—`; su tarjeta en `/games` muestra `—`.
- [x] La tarjeta de ROCAS en `/games` muestra el mismo número que Mejor global en `/games/rocas` y que el `#01` de su leaderboard.
- [x] Tras guardar una partida con sesión en ROCAS, recargar `/games/rocas` muestra Partidas incrementado en 1.
- [x] `formatPlays` devuelve: `0` → `"0"`, `9870` → `"9.870"`, `12000` → `"12K"`, `15699` → `"15,6K"`, `1250000` → `"1,2M"`, `null` → `"—"`.
- [x] Con `get_game_stats` fallando (p. ej. nombre de función erróneo en local), `/games/rocas` muestra Partidas y Mejor global `—`, la dificultad y el leaderboard se ven normal, `/games` muestra `—` en todas las tarjetas y el servidor registra el error.
- [x] El Salón de la Fama y la landing se ven igual que antes.

---

## Decisiones

- **Sí:** detalle y tarjetas en la misma spec. Es el mismo dato (mejor marca) y así desaparece `GAME_MOCK_STATS` por completo; no quedan dos fuentes que se contradigan.
- **Sí:** Partidas = filas de `scores` del juego. Sin tablas nuevas.
- **No:** tabla de partidas que registre también a invitados. Abre inserciones anónimas y riesgo de spam; merece su propia spec.
- **Sí:** dificultad como columna `difficulty smallint` (1–5) en `games`, sembrada por migración. Es un atributo del juego, no una estadística.
- **No:** derivar la dificultad de las puntuaciones (no tiene un significado claro).
- **Sí:** valores de dificultad del seed: bloque-buster 2, caida 3, serpentina 2, gloton 3, invasores 3, rocas 4, ranaria 3, duelo-pixel 4.
- **Sí:** una sola RPC `get_game_stats(p_game_id default null)` con `group by` en la BD. Sirve a la biblioteca (8 juegos, una llamada) y al detalle (uno). Mismo patrón que `get_leaderboard`.
- **No:** vista SQL (necesita `security_invoker = on` aparte) ni consultas PostgREST por juego (16 consultas en la biblioteca).
- **Sí:** `left join` desde `games`: los juegos sin partidas devuelven `plays = 0` y `best = null` sin lógica extra en Node.
- **Sí:** sin partidas → Partidas `0` y Mejor global `—`. No existe marca, mostrar `0` sería inventarla.
- **Sí:** error en estadísticas degrada a `—` sin tumbar la página, como el leaderboard. Es un dato secundario.
- **Sí:** formato compacto de Partidas con decimal `es-ES` (`15,6K`), exacto por debajo de 10.000. Se trunca para no mostrar más partidas de las reales y se omite `,0`.
- **Sí:** formateadores en `lib/games.ts` porque los usa `GameCard`, que es componente cliente; la lectura en `lib/game-stats.ts`, solo servidor.
- **Sí:** las estadísticas llegan a `Library` por props desde la página, igual que los juegos en SPEC 06.
- **Sí:** cálculo en cada petición sin caché. Las rutas ya son dinámicas desde SPEC 06 y el volumen de `scores` es pequeño.
- **Sí:** verificación con `build` + `lint` + checklist manual + comprobaciones por MCP. Sigue sin framework de tests.

---

## Riesgos

| Riesgo                                                                                     | Mitigación                                                                                                                        |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `get_game_stats()` sin filtro recorre toda `scores` en cada visita a `/games`              | Aceptado con el volumen actual; el índice `(game_id, score desc)` ayuda. Contadores materializados o caché quedan para otra spec. |
| `count(*)` llega como `bigint` y los tipos generados pueden no marcar `best` como nullable | Convertir con `Number()` y tratar `best` como `number \| null` en `lib/game-stats.ts`.                                            |
| La migración de `difficulty` falla si se añade `not null` antes del `update`               | Orden explícito: añadir nullable → rellenar → `set not null` + `CHECK`.                                                           |
| Las Partidas reales son muy inferiores al mock (pasan de «15.6K» a una cifra pequeña)      | Esperado: es el objetivo de la spec. Las partidas de invitados no cuentan (decisión explícita).                                   |
| `getGameStats` y `getLeaderboard` duplican la conexión a Supabase en el detalle            | Se ejecutan en paralelo con `Promise.all`; el coste es una RPC extra por petición.                                                |

---

## Lo que **no** entra en esta spec

- Partidas de invitados o una tabla de partidas propia.
- Salón de la Fama y landing con datos reales.
- Edición de la dificultad desde la app.
- Etiquetas fijas del detalle (`1 JUGADOR`, `TECLADO / TÁCTIL`, `RETRO 1985`).
- Caché, revalidación o contadores materializados.
- Tests automáticos.

Cada uno de estos puntos, si llega, va en su propia spec.

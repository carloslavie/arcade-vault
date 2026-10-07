# SPEC 06 — Tabla `games` en Supabase y leaderboard real en el detalle del juego

> **Estado:** Aprobado
> **Depende de:** SPEC 02, SPEC 04, SPEC 05
> **Fecha:** 2026-10-06
> **Objetivo:** Mover el catálogo de juegos de `lib/games.ts` a una tabla `public.games` de Supabase (con FK desde `scores`) y mostrar en `/games/[id]` un leaderboard real con la mejor marca de cada jugador.

---

## Por qué existe esta spec

SPEC 05 dejó la tabla `scores` escribiéndose, pero nadie la lee: el panel MEJORES PUNTUACIONES de `/games/[id]` sigue saliendo de `seededScores`.
Además, `scores.game_id` es un `text` suelto que solo comprueba un formato; la BD no sabe qué juegos existen.
El catálogo vive en el array `GAMES` de `lib/games.ts` y lo importan seis sitios distintos.
Esta spec convierte el catálogo en una tabla con integridad referencial, hace que todas las pantallas lo lean de ahí y estrena la lectura de `scores` con un leaderboard real en el detalle del juego.

---

## Alcance

**Dentro:**

- **Tabla `public.games`** con migración versionada: `id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `sort_order`, `created_at`. Sembrada en la misma migración con los 8 juegos actuales (mismos textos y orden que `GAMES`). RLS de solo lectura pública; sin políticas de escritura (solo se escribe por migración).
- **FK `scores.game_id → games.id`.** El `CHECK` de formato existente se mantiene.
- **Función RPC `public.get_leaderboard(p_game_id, p_limit)`**: mejor marca por jugador (una fila por usuario), join con `profiles.username`, orden por puntuación descendente y, en empate, quien la consiguió antes. `security invoker`, `stable`, `search_path = ''`.
- **Tipos regenerados** (`npm run db:types`).
- **Capa de lectura en servidor:**
  - `lib/catalog.ts`: `getGames()` y `getGame(id)` envueltas en `cache()` de React.
  - `lib/leaderboard.ts`: `getLeaderboard(gameId)` (top 10).
- **Todas las pantallas leen el catálogo de la BD:** landing (`/`), biblioteca (`/games`), detalle (`/games/[id]`), jugar (`/games/[id]/play`) y las pestañas del Salón de la Fama. Los componentes cliente (`Library`, `HallOfFame`) reciben los juegos por props desde su página.
- **Se elimina el array `GAMES`** y `getGame` de `lib/games.ts`. Se elimina `generateStaticParams` de `/games/[id]` y `/games/[id]/play` (las rutas pasan a ser dinámicas).
- **Leaderboard real en `/games/[id]`**: top 10 con rango, `username`, puntuación y fecha (`dd/mm/aaaa`) de la mejor marca. Estados:
  - Con filas: igual que el mock actual (`top1/top2/top3` en las tres primeras).
  - Sin filas (incluye los 7 juegos sin motor): `▸ AÚN NO HAY PUNTUACIONES`.
  - Error al consultar: `> ERROR AL CARGAR EL RANKING.` en magenta; el resto de la página se renderiza normal.
- **`app/error.tsx`**: pantalla de error retro con REINTENTAR (`reset()`) para cuando falla la carga del catálogo en cualquier página.
- **`best` y `plays` siguen siendo mock**, pero salen de un mapa en código por id (`GAME_MOCK_STATS`) en lugar de vivir en `Game`. Se usan en las tarjetas (MEJOR PUNTUACIÓN) y en el `stat-strip` del detalle (Partidas, Mejor global).
- CSS para los estados vacío y error del leaderboard y para `app/error.tsx`, diseñado con `/frontend-design` siguiendo el estilo existente (`.leaderboard`, `.auth-error`).

**Fuera de alcance (para futuras specs):**

- Salón de la Fama con datos reales (podio, tabla y "TU MEJOR MARCA" siguen con `seededScores`; solo cambian las pestañas).
- `best` y `plays` reales en tarjetas y detalle.
- Landing con datos reales (ticker y TOP JUGADORES · HOY siguen siendo mock de `lib/home.ts`).
- Resaltar la fila del usuario o mostrar su posición fuera del top 10.
- Paginación o más de 10 filas.
- Caché de páginas y revalidación tras `saveScore`.
- Panel de administración o escritura de `games` desde la app.
- Columna `playable` en la BD (`PLAYABLE_GAME_IDS` sigue en código).
- Antitrampas, puntuaciones de invitados, tests automáticos.

---

## Modelo de datos

### Migración 1 — `supabase/migrations/<timestamp>_create_games.sql`

```sql
create table public.games (
  id         text primary key check (id ~ '^[a-z0-9-]{1,32}$'),
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover      text not null,
  color      text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  sort_order integer not null unique,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "games are readable by everyone"
  on public.games for select
  to anon, authenticated
  using (true);

-- Sin políticas de insert/update/delete: el catálogo solo cambia por migración.

insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('bloque-buster', 'BLOQUE BUSTER', '…', '…', 'ARCADE',  'cover-bricks',   'cyan',    1),
  ('caida',         'CAÍDA',         '…', '…', 'PUZZLE',  'cover-tetro',    'magenta', 2),
  ('serpentina',    'SERPENTINA',    '…', '…', 'ARCADE',  'cover-snake',    'green',   3),
  ('gloton',        'GLOTÓN',        '…', '…', 'ARCADE',  'cover-glot',     'yellow',  4),
  ('invasores',     'INVASORES',     '…', '…', 'SHOOTER', 'cover-invaders', 'green',   5),
  ('rocas',         'ROCAS',         '…', '…', 'SHOOTER', 'cover-rocas',    'yellow',  6),
  ('ranaria',       'RANARIA',       '…', '…', 'ARCADE',  'cover-rana',     'green',   7),
  ('duelo-pixel',   'DUELO PIXEL',   '…', '…', 'VERSUS',  'cover-duelo',    'cyan',    8);
-- '…' = textos short/long copiados literalmente del array GAMES actual (escapando comillas simples).

alter table public.scores
  add constraint scores_game_id_fkey
  foreign key (game_id) references public.games (id);
```

El `insert` va antes de la FK para que las filas existentes de `scores` (`game_id = 'rocas'`) la cumplan. La FK no lleva `on delete cascade`: borrar un juego con puntuaciones debe fallar.

### Migración 2 — `supabase/migrations/<timestamp>_create_get_leaderboard.sql`

```sql
create function public.get_leaderboard(p_game_id text, p_limit integer default 10)
returns table (rank bigint, username text, score integer, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    row_number() over (order by b.score desc, b.created_at asc) as rank,
    p.username,
    b.score,
    b.created_at
  from (
    select distinct on (s.user_id) s.user_id, s.score, s.created_at
    from public.scores s
    where s.game_id = p_game_id
    order by s.user_id, s.score desc, s.created_at asc
  ) b
  join public.profiles p on p.id = b.user_id
  order by rank
  limit least(greatest(p_limit, 1), 50);
$$;
```

`security invoker`: respeta la RLS de `scores` y `profiles`, que ya son de lectura pública. El índice `scores_game_score_idx (game_id, score desc)` de SPEC 05 cubre el filtro por juego.

### Tipos (`lib/games.ts`, apto para cliente y servidor)

```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: NeonColor;
}
// best y plays salen de Game

export interface GameMockStats {
  best: number;
  plays: string;
}

// Valores actuales de GAMES; hasta que haya estadísticas reales
export const GAME_MOCK_STATS: Record<string, GameMockStats>;
export function mockStats(id: string): GameMockStats; // { best: 0, plays: "0" } si no existe

// Se mantienen: ScoreRow, CATS, PLAYERS, seededScores (el Salón de la Fama sigue usándolos)
```

### Catálogo (`lib/catalog.ts`, solo servidor)

```ts
// Ordenados por sort_order. Lanza si Supabase falla (lo recoge app/error.tsx).
export const getGames: () => Promise<Game[]>; // cache(async () => …)

// null si no existe (→ notFound()); lanza si Supabase falla.
export const getGame: (id: string) => Promise<Game | null>; // cache(async (id) => …)
```

Usa `createClient()` de `lib/supabase/server.ts`. Convierte la fila de la BD en `Game` (`cat` y `color` se estrechan a sus uniones; los `CHECK` garantizan los valores). `cache()` evita la doble consulta entre `generateMetadata` y la página.

### Leaderboard (`lib/leaderboard.ts`, solo servidor)

```ts
export const LEADERBOARD_SIZE = 10;

// null si Supabase falla (se registra con console.error); [] si no hay puntuaciones.
export async function getLeaderboard(
  gameId: string,
): Promise<ScoreRow[] | null>;
```

Llama a `supabase.rpc("get_leaderboard", { p_game_id: gameId, p_limit: LEADERBOARD_SIZE })` y mapea a `ScoreRow` (`name = username`, `date = created_at` formateada `dd/mm/aaaa` en UTC con `es-ES`).

### Componente `Leaderboard`

```ts
export function Leaderboard({ rows }: { rows: ScoreRow[] | null }): JSX.Element;
```

| `rows`    | Muestra                                        |
| --------- | ---------------------------------------------- |
| `null`    | `> ERROR AL CARGAR EL RANKING.` (magenta)      |
| `[]`      | `▸ AÚN NO HAY PUNTUACIONES`                    |
| con filas | Filas actuales (`#01`, username, fecha, score) |

El título MEJORES PUNTUACIONES se muestra en los tres casos.

---

## Plan de implementación

1. **Migración `games` + FK.**
   - Crear `supabase/migrations/<timestamp>_create_games.sql` con el SQL del modelo y los 8 juegos copiados literalmente de `GAMES`. Aplicar con `npx supabase db push`.
   - Verificar con el MCP: `list_tables` muestra `games` con RLS, `select count(*) from games` = 8, y la FK `scores_game_id_fkey` existe.
2. **Migración `get_leaderboard`.**
   - Crear `supabase/migrations/<timestamp>_create_get_leaderboard.sql` y aplicarla.
   - `npm run db:types`.
   - Verificar con `execute_sql`: `select * from get_leaderboard('rocas')` devuelve una fila por usuario; `get_advisors` (security y performance) sin avisos sobre `games` ni `get_leaderboard`.
3. **Capa de lectura.**
   - En `lib/games.ts`: quitar `best`/`plays` de `Game`, eliminar `GAMES` y `getGame`, añadir `GAME_MOCK_STATS` y `mockStats`.
   - Crear `lib/catalog.ts` (`getGames`, `getGame`) y `lib/leaderboard.ts` (`getLeaderboard`).
   - Este paso deja el build roto hasta el paso 4; se hacen juntos antes de verificar.
4. **Pantallas.** Consultar antes `node_modules/next/dist/docs/` sobre `error.tsx`, `generateStaticParams`/rutas dinámicas y `cache`.
   - `app/page.tsx` async: `getGames()` → `<Landing games={…} />` (`MiniCard` usa `games.slice(0, 6)`).
   - `app/games/page.tsx` async: `<Library games={…} />`; `Library` filtra sobre la prop.
   - `app/hall-of-fame/page.tsx` async: `<HallOfFame games={…} />`; pestañas desde la prop, filas mock sin cambios.
   - `components/game-card.tsx`: `mockStats(game.id).best`.
   - `app/games/[id]/play/page.tsx`: quitar `generateStaticParams`, usar `getGame` de `lib/catalog.ts`.
   - Verificar: `npm run build` pasa y las 5 pantallas se ven igual que antes.
5. **Leaderboard real.** Ejecutar `/frontend-design` para los estados vacío/error del leaderboard y para `app/error.tsx`.
   - `app/games/[id]/page.tsx`: quitar `generateStaticParams` y `seededScores`; `getGame` + `getLeaderboard` en paralelo (`Promise.all`); `stat-strip` con `mockStats`.
   - `components/leaderboard.tsx`: aceptar `rows: ScoreRow[] | null` con los tres estados.
   - Crear `app/error.tsx` (`"use client"`, mensaje retro, botón REINTENTAR con `reset()`, enlace VOLVER AL VAULT).
   - CSS en `app/globals.css`.
6. **Cierre.**
   - Jugar una partida con sesión en ROCAS y comprobar que aparece en `/games/rocas` tras recargar.
   - Recorrer los criterios de aceptación.
   - `npm run lint` y `npm run build` pasan.

---

## Criterios de aceptación

- [x] `npm run build` termina sin errores ni warnings de tipos.
- [x] `npm run lint` termina sin errores.
- [x] La consola del navegador no muestra errores ni avisos de hidratación en `/`, `/games`, `/games/rocas`, `/games/rocas/play` y `/hall-of-fame`.
- [x] `supabase/migrations/` contiene las dos migraciones nuevas y `list_tables` (MCP) muestra `public.games` con RLS activado y 8 filas.
- [x] `get_advisors` (security y performance) no muestra avisos sobre `games` ni `get_leaderboard`.
- [x] `lib/supabase/database.types.ts` incluye la tabla `games` y la función `get_leaderboard`.
- [x] Un `insert` en `scores` con `game_id = 'no-existe'` (vía `execute_sql`) falla por la FK.
- [x] Un `insert`/`update`/`delete` en `games` con la publishable key es rechazado por RLS.
- [x] `grep -rn "GAMES\b" app components lib` no devuelve resultados (salvo comentarios).
- [x] Biblioteca, landing (vista previa de 6 juegos), detalle, jugar y pestañas del Salón de la Fama muestran los 8 juegos en el mismo orden y con los mismos textos que antes.
- [x] Cambiar el `title` de un juego con `execute_sql` se refleja en `/games` y en `/games/<id>` al recargar (después se revierte).
- [x] Las tarjetas siguen mostrando MEJOR PUNTUACIÓN y el detalle Partidas y Mejor global con los valores mock anteriores.
- [x] `/games/no-existe` y `/games/no-existe/play` devuelven la página 404.
- [x] Con dos usuarios con varias partidas en ROCAS, `/games/rocas` muestra cada usuario una sola vez con su mejor puntuación, ordenados de mayor a menor.
- [x] En empate de puntuación aparece primero quien la consiguió antes (`select * from get_leaderboard('rocas')` lo confirma).
- [x] Cada fila muestra `#NN`, `username`, fecha `dd/mm/aaaa` de la mejor marca y la puntuación con formato `es-ES`; las tres primeras llevan `top1/top2/top3`.
- [ ] Con más de 10 jugadores, el leaderboard muestra exactamente 10 filas.
- [ ] Tras guardar una partida nueva con sesión, recargar `/games/rocas` la muestra en el leaderboard si entra en el top 10.
- [x] `/games/caida` muestra `▸ AÚN NO HAY PUNTUACIONES` y no muestra nombres inventados.
- [x] Con `get_leaderboard` fallando (p. ej. llamada con un nombre de función erróneo en local), `/games/rocas` muestra `> ERROR AL CARGAR EL RANKING.` en magenta, el resto del detalle se ve normal y el servidor registra el error.
- [x] Sin `NEXT_PUBLIC_SUPABASE_URL`, `/games` muestra la pantalla de `app/error.tsx` con REINTENTAR y el servidor registra el error.
- [x] El Salón de la Fama sigue mostrando podio y tabla mock, con las pestañas generadas desde la BD.

---

## Decisiones

- **Sí:** catálogo completo en `public.games` como única fuente de verdad. Todas las pantallas leen de ahí y se elimina `GAMES`.
- **No:** dejar una copia del catálogo en código como fallback. Dos fuentes divergen; si la BD falla, se muestra un error honesto.
- **Sí:** FK `scores.game_id → games.id` sin `on delete cascade`. La BD pasa a conocer los juegos y protege las puntuaciones existentes.
- **Sí:** `games` de solo lectura con RLS; el catálogo cambia únicamente por migración. No hay panel de administración.
- **Sí:** `PLAYABLE_GAME_IDS` sigue en código. Que un juego sea jugable depende de que exista su motor en `ENGINES`, que es código.
- **No:** columna `playable` en `games` (duplicaría `PLAYABLE_GAME_IDS`).
- **Sí:** `best` y `plays` fuera de la tabla, como mock en `GAME_MOCK_STATS`. Meter valores inventados en la BD obligaría a migrarlos de nuevo cuando sean reales.
- **Sí:** leaderboard por mejor marca de cada jugador, empates resueltos por fecha más antigua.
- **No:** listar todas las partidas (un jugador podría llenar el top 10).
- **Sí:** función RPC `get_leaderboard` en SQL con `distinct on`. La deduplicación se hace en la BD y escala.
- **No:** vista SQL (no admite el límite parametrizado con la misma claridad) ni deduplicar en Node (trae filas de más).
- **Sí:** `security invoker` y `search_path = ''`: la función no amplía permisos y sigue las recomendaciones de los advisors.
- **Sí:** top 10 sin resaltar al usuario. Resaltar y "tu posición" quedan para otra spec.
- **Sí:** solo el leaderboard de `/games/[id]` lee `scores` en esta spec. Salón de la Fama, landing y `best` real son otras decisiones de ranking.
- **Sí:** estado vacío real (`▸ AÚN NO HAY PUNTUACIONES`) en lugar de datos inventados, también para los juegos sin motor.
- **Sí:** renderizado dinámico por petición y eliminación de `generateStaticParams`. El leaderboard siempre está al día sin tocar `saveScore`, y el build no necesita la BD.
- **No:** caché con `revalidatePath`/tags (más piezas para un tráfico que no lo necesita aún).
- **Sí:** `cache()` de React en `getGames`/`getGame` para no consultar dos veces entre `generateMetadata` y la página.
- **Sí:** lectura en `lib/catalog.ts` y `lib/leaderboard.ts`, separadas de `lib/games.ts`. `lib/games.ts` lo importan componentes cliente y no puede arrastrar `next/headers`.
- **Sí:** error del ranking aislado en su bloque; error del catálogo en `app/error.tsx`. Sin juego no hay página que mostrar; sin ranking, sí.
- **Sí:** fechas formateadas en UTC en el servidor. Evita depender de la zona horaria del servidor de despliegue.
- **Sí:** verificación con `build` + `lint` + checklist manual + comprobaciones por MCP. Sigue sin framework de tests.

---

## Riesgos

| Riesgo                                                                                    | Mitigación                                                                                                                |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| La FK falla al aplicarse si hay filas en `scores` con un `game_id` que no está en el seed | El `insert` va antes del `alter table`. Comprobar antes con `select distinct game_id from scores`.                        |
| Textos del seed distintos a los de `GAMES` (tildes, comillas)                             | Copiarlos literalmente escapando `'` como `''`. Hay criterio de aceptación que compara las pantallas antes/después.       |
| Las páginas pasan a dinámicas: cada visita consulta Supabase y la landing es más lenta    | Aceptado: 8 filas y una RPC indexada. `cache()` evita consultas duplicadas por petición. La caché queda como spec futura. |
| Supabase caído deja toda la web en la pantalla de error                                   | Aceptado por la decisión de fuente única. `app/error.tsx` permite reintentar y el servidor registra el fallo.             |
| `generateMetadata` y la página lanzan la misma consulta dos veces                         | `cache()` de React en `getGame`.                                                                                          |
| Los tipos generados devuelven `cat`/`color` como `string`                                 | Estrechar en el mapeo de `lib/catalog.ts`; los `CHECK` de la BD garantizan que el valor es válido.                        |
| API de `error.tsx`, rutas dinámicas o `cache` distinta en Next 16                         | Leer la documentación de `node_modules/next/dist/docs/` antes del paso 4.                                                 |

---

## Lo que **no** entra en esta spec

- Salón de la Fama con datos reales.
- `best` y `plays` reales.
- Landing (ticker y top jugadores) con datos reales.
- Resaltar al usuario o mostrar su posición fuera del top.
- Caché y revalidación.
- Administración del catálogo desde la app.
- Antitrampas, invitados y tests automáticos.

Cada uno de estos puntos, si llega, va en su propia spec.

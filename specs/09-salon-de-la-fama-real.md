# SPEC 09 — Salón de la Fama con datos reales

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 05, SPEC 06, SPEC 08
> **Fecha:** 2026-10-08
> **Objetivo:** Que `/hall-of-fame` muestre, para cada juego jugable, el podio, el top 20 y la mejor marca del usuario con sesión leídos de Supabase, eliminando `seededScores`.

---

## Por qué existe esta spec

El Salón de la Fama es la única pantalla de puntuaciones que sigue siendo 100 % mock.
`components/hall-of-fame.tsx` genera el podio y las 12 filas con `seededScores`, y la fila «TU MEJOR MARCA» se inventa con una fórmula (`youRank`, `youScore`, fecha fija `11/05/2026`).
Además muestra las 8 pestañas, aunque solo ROCAS tiene motor, y contradice al leaderboard real del detalle (SPEC 06) y a la biblioteca (SPEC 08).
Esta spec conecta el Salón de la Fama a `scores`, limita las pestañas a los juegos jugables y hace real la fila del usuario.

---

## Alcance

**Dentro:**

- **Pestañas solo de juegos jugables**: la página filtra `getGames()` con `isPlayable`, en el orden de `sort_order`. Hoy: solo ROCAS.
- **Pestaña activa por search param `?game=<id>`**: las pestañas pasan a ser `<Link href="/hall-of-fame?game=<id>" scroll={false}>` con `aria-current="page"` en la activa. Sin param, o con un id que no es jugable, se usa el primer juego jugable (sin redirigir ni 404).
- **Ranking real**: la página llama a `getLeaderboard(gameId, HALL_OF_FAME_SIZE)` (20 filas) solo para el juego activo. Misma RPC `get_leaderboard` de SPEC 06 (mejor marca por jugador, empate gana quien la consiguió antes).
- **Podio** = puestos 1–3 del ranking. **Tabla** = ranking completo #01–#20, con los 3 primeros resaltados (`top1/top2/top3`) como ahora.
- **Mejor marca del usuario con sesión**: nueva RPC `public.get_player_best(p_game_id text, p_user_id uuid)` que devuelve su rango real, nombre, mejor marca y fecha.
  - Si está en el top 20: su fila de la tabla se resalta con la clase `you` y no se añade fila extra.
  - Si está fuera del top 20: se añade `▸ TU MEJOR MARCA EN <TÍTULO>` + fila `you` con rango, nombre, puntuación y fecha reales.
  - Si no tiene marca en ese juego: `▸ TU MEJOR MARCA EN <TÍTULO>` + `▸ AÚN NO TIENES MARCA EN <TÍTULO>`.
  - Invitado: no se muestra nada.
  - Si falla `get_player_best` o el ranking: la fila del usuario no se muestra.
- **`HallOfFame` pasa a componente de servidor** que recibe todo por props (deja de usar `useState`, `useMemo` y `useUser`).
- **`getCurrentUser` envuelto en `cache()` de React** para que el layout y la página compartan una sola llamada a Supabase por petición.
- **Estados:**
  - Sin puntuaciones: podio con 3 huecos fantasma (`------` / `000000`, atenuados) y tabla con `▸ AÚN NO HAY PUNTUACIONES`.
  - Menos de 3 jugadores: los puestos vacíos del podio se pintan como huecos fantasma.
  - Error al leer el ranking: podio con huecos fantasma y tabla con `> ERROR AL CARGAR EL RANKING.` + `RECARGA LA PÁGINA PARA REINTENTAR.` (mismo texto que el detalle). Cabecera y pestañas se ven normal.
  - Ningún juego jugable: en lugar de pestañas, podio y tabla se muestra `▸ PRÓXIMAMENTE MÁS JUEGOS` (mismo texto que la biblioteca de SPEC 08).
- **Se eliminan** `seededScores` y `PLAYERS` de `lib/games.ts`.
- CSS nuevo (huecos fantasma del podio, filas de estado de la tabla, fila `you` dentro del top, estado sin juegos) en `app/globals.css`, diseñado con `/frontend-design` siguiendo el estilo existente (`.lb-row.ghost` y `.lb-status` de SPEC 06, `.hall-table .tr.you`).

**Fuera de alcance (para futuras specs):**

- Landing con datos reales (ticker, `TOP JUGADORES · HOY`, stats).
- Filtrar la landing o el detalle por juegos jugables.
- Rankings por periodo (hoy, semana, mes) o globales entre juegos.
- Paginación o más de 20 filas.
- Perfil público de jugador al hacer clic en un nombre.
- Caché, revalidación o realtime.
- Tests automáticos.

---

## Modelo de datos

### Migración — `supabase/migrations/<timestamp>_create_get_player_best.sql`

```sql
-- Mejor marca de un jugador en un juego y su rango, con el mismo orden que get_leaderboard.
-- 0 filas si el jugador no tiene puntuaciones en ese juego.
-- security invoker: respeta la RLS de scores y profiles (ambas de lectura pública).
create function public.get_player_best(p_game_id text, p_user_id uuid)
returns table (rank bigint, username text, score integer, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.rank, p.username, r.score, r.created_at
  from (
    select
      b.user_id,
      b.score,
      b.created_at,
      row_number() over (order by b.score desc, b.created_at asc) as rank
    from (
      select distinct on (s.user_id) s.user_id, s.score, s.created_at
      from public.scores s
      where s.game_id = p_game_id
      order by s.user_id, s.score desc, s.created_at asc
    ) b
  ) r
  join public.profiles p on p.id = r.user_id
  where r.user_id = p_user_id;
$$;
```

`p_user_id` llega del servidor (`getCurrentUser`), no del cliente. Los datos ya son de lectura pública, así que pasar el id no expone nada nuevo.

### Lectura (`lib/leaderboard.ts`, solo servidor)

```ts
export const LEADERBOARD_SIZE = 10;
export const HALL_OF_FAME_SIZE = 20;

// Se añade el parámetro limit (por defecto LEADERBOARD_SIZE). El detalle no cambia.
export async function getLeaderboard(
  gameId: string,
  limit?: number,
): Promise<ScoreRow[] | null>;

// null si Supabase falla (se registra con console.error);
// { row: null } si el jugador no tiene marca en ese juego.
export async function getPlayerBest(
  gameId: string,
  userId: string,
): Promise<{ row: ScoreRow | null } | null>;
```

`getPlayerBest` sigue el patrón de `getLeaderboard`: `createClient()`, `supabase.rpc("get_player_best", …)`, mismo `DATE_FORMAT` UTC y `unstable_rethrow` en el `catch`.

### Página (`app/hall-of-fame/page.tsx`)

```ts
export default async function HallOfFamePage({
  searchParams,
}: PageProps<"/hall-of-fame">) {
  const { game } = await searchParams; // string | string[] | undefined → solo se acepta string
  const playable = (await getGames()).filter((g) => isPlayable(g.id));
  const active = playable.find((g) => g.id === game) ?? playable[0]; // undefined si no hay jugables
  // En paralelo: getLeaderboard(active.id, HALL_OF_FAME_SIZE) y getCurrentUser()
  // Después, si hay usuario y el ranking no falló: getPlayerBest(active.id, user.id)
}
```

### Componente (`components/hall-of-fame.tsx`, servidor)

```ts
export function HallOfFame(props: {
  games: Game[]; // solo jugables
  active: Game | undefined; // undefined → ▸ PRÓXIMAMENTE MÁS JUEGOS
  rows: ScoreRow[] | null; // null → error
  you:
    | {
        // undefined → invitado o error: no se muestra nada
        name: string;
        best: ScoreRow | null; // null → AÚN NO TIENES MARCA
      }
    | undefined;
}): JSX.Element;
```

La fila del usuario dentro del top se detecta comparando `best.rank` con `rows[i].rank` (el nombre también coincide, pero el rango es único).

| Situación                     | Podio                    | Tabla                           | Fila del usuario                                   |
| ----------------------------- | ------------------------ | ------------------------------- | -------------------------------------------------- |
| Ranking con ≥ 3 jugadores     | Puestos 1–3 reales       | #01–#20 reales                  | Según los casos de abajo                           |
| Ranking con 1–2 jugadores     | Reales + huecos fantasma | Filas reales                    | Según los casos de abajo                           |
| Ranking vacío                 | 3 huecos fantasma        | `▸ AÚN NO HAY PUNTUACIONES`     | Invitado: nada · Con sesión: `AÚN NO TIENES MARCA` |
| Error en ranking              | 3 huecos fantasma        | `> ERROR AL CARGAR EL RANKING.` | Nada                                               |
| Usuario en el top 20          | —                        | Su fila con clase `you`         | Sin fila extra                                     |
| Usuario fuera del top 20      | —                        | —                               | Etiqueta + fila `you` con rango real               |
| Usuario sin marca en el juego | —                        | —                               | Etiqueta + `▸ AÚN NO TIENES MARCA EN <TÍTULO>`     |
| Error en `get_player_best`    | —                        | —                               | Nada                                               |
| Ningún juego jugable          | —                        | —                               | Solo cabecera + `▸ PRÓXIMAMENTE MÁS JUEGOS`        |

---

## Plan de implementación

1. **Migración `get_player_best`.**
   - Crear `supabase/migrations/<timestamp>_create_get_player_best.sql` y aplicarla con `npx supabase db push`.
   - `npm run db:types`.
   - Verificar con el MCP (`execute_sql`): para un usuario con marcas en ROCAS, el `rank` y `score` coinciden con su fila en `select * from get_leaderboard('rocas', 50)`; para un usuario sin marcas devuelve 0 filas. `get_advisors` (security y performance) sin avisos sobre `get_player_best`.
2. **Lectura.**
   - `lib/leaderboard.ts`: añadir `HALL_OF_FAME_SIZE`, el parámetro `limit` a `getLeaderboard` y `getPlayerBest`.
   - `lib/supabase/server.ts`: envolver `getCurrentUser` con `cache()` de `react`.
   - Verificar: `npm run build` pasa y `/games/rocas` sigue mostrando 10 filas.
3. **Página y componente.**
   - `app/hall-of-fame/page.tsx`: filtrar jugables, resolver `?game=`, cargar ranking, usuario y mejor marca.
   - `components/hall-of-fame.tsx`: quitar `"use client"`, `useState`, `useMemo` y `useUser`; pestañas como `Link`; podio, tabla y fila del usuario desde props.
   - `lib/games.ts`: eliminar `seededScores` y `PLAYERS`.
   - Verificar: `/hall-of-fame` y `/hall-of-fame?game=rocas` muestran los mismos datos que el leaderboard de `/games/rocas`.
4. **Estados visuales.** Ejecutar `/frontend-design` para huecos fantasma del podio, filas de estado de la tabla (vacío y error), fila `you` dentro del top y estado sin juegos.
   - CSS en `app/globals.css`.
   - Verificar cada estado forzándolo temporalmente (ranking `[]`, ranking `null`, `playable = []`) y revertir.
5. **Cierre.**
   - Con un usuario sin marca en ROCAS: ver `AÚN NO TIENES MARCA`, jugar y guardar una partida, recargar y ver su fila real.
   - Recorrer los criterios de aceptación.
   - `npm run lint` y `npm run build` pasan.

---

## Criterios de aceptación

- [x] `npm run build` termina sin errores ni warnings de tipos.
- [x] `npm run lint` termina sin errores.
- [x] La consola del navegador no muestra errores ni avisos de hidratación en `/hall-of-fame`.
- [x] `supabase/migrations/` contiene la migración nueva y `lib/supabase/database.types.ts` incluye la función `get_player_best`.
- [x] `get_advisors` (security y performance) no muestra avisos sobre `get_player_best`.
- [x] `grep -rn "seededScores" app components lib` no devuelve resultados.
- [x] `components/hall-of-fame.tsx` no contiene `"use client"`.
- [x] `/hall-of-fame` muestra una sola pestaña: ROCAS, marcada como activa (`aria-current="page"`).
- [x] `/hall-of-fame`, `/hall-of-fame?game=rocas`, `/hall-of-fame?game=caida` y `/hall-of-fame?game=xyz` muestran todos el ranking de ROCAS sin error ni 404.
- [x] El podio y las primeras 10 filas de la tabla coinciden en nombre, puntuación y fecha con el leaderboard de `/games/rocas`.
- [x] La tabla muestra como máximo 20 filas y coincide con `select * from get_leaderboard('rocas', 20)`.
- [x] Como invitado no se muestra ninguna fila de «TU MEJOR MARCA».
- [x] Con sesión y marca dentro del top 20, la fila del usuario se resalta en la tabla y no aparece fila extra.
- [x] Con sesión y marca fuera del top 20 (verificable bajando temporalmente `HALL_OF_FAME_SIZE`), aparece la fila extra con el mismo rango que devuelve `get_player_best`.
- [x] Con sesión y sin marca en ROCAS aparece `▸ AÚN NO TIENES MARCA EN ROCAS`; tras guardar una partida y recargar, aparece su fila real.
- [x] Con el ranking forzado a `[]`: podio con 3 huecos fantasma y `▸ AÚN NO HAY PUNTUACIONES`. Se revierte después.
- [x] Con `get_leaderboard` fallando (p. ej. nombre de RPC erróneo en local): podio fantasma, `> ERROR AL CARGAR EL RANKING.`, sin fila del usuario, y el servidor registra el error.
- [x] Con los jugables forzados a `[]`: se ve la cabecera y `▸ PRÓXIMAMENTE MÁS JUEGOS`, sin pestañas, podio ni tabla. Se revierte después.
- [x] `/games/rocas` sigue mostrando 10 filas en su leaderboard (SPEC 06 intacta).
- [x] La landing se ve igual que antes.

---

## Decisiones

- **Sí:** pestañas solo de juegos jugables (`isPlayable`), igual que la biblioteca de SPEC 08. Resuelve la incoherencia que SPEC 08 dejó aceptada para el Salón de la Fama.
- **Sí:** pestaña activa en la URL (`?game=`) y carga en servidor solo del juego activo. URL compartible, una RPC por visita y sin fetch en cliente.
- **No:** precargar el ranking de todas las pestañas (N RPCs por visita) ni consultar Supabase desde el cliente (estados de carga y otra vía de acceso a datos).
- **Sí:** `?game=` ausente o inválido cae al primer juego jugable, sin redirigir ni 404. Un enlace viejo a un juego sin motor sigue llevando a un Salón útil.
- **Sí:** 20 filas (`HALL_OF_FAME_SIZE`), el doble del detalle, para que el Salón aporte algo distinto. Cabe en el límite de 50 de `get_leaderboard`.
- **Sí:** reutilizar `get_leaderboard` con un `limit`; no se crea otra RPC de ranking.
- **Sí:** la tabla repite a los 3 del podio (#01–#20), como el diseño actual. Cambio mínimo de diseño.
- **Sí:** RPC nueva `get_player_best` con el mismo orden que `get_leaderboard`, para que el rango del usuario fuera del top sea real y coherente con la tabla.
- **No:** calcular el rango en Node pidiendo el ranking completo (50 como máximo, no escala) ni quitar la fila del usuario.
- **Sí:** el id de usuario llega como parámetro desde el servidor en lugar de usar `auth.uid()` dentro de la RPC: permite verificarla con `execute_sql` y no expone datos nuevos (lectura pública).
- **Sí:** si el usuario está en el top 20 se resalta su fila y no se repite abajo.
- **Sí:** huecos fantasma en el podio cuando faltan jugadores, mismo lenguaje visual que el leaderboard vacío de SPEC 06.
- **Sí:** error del ranking degrada dentro de la tabla, sin tumbar la página, y oculta la fila del usuario (sin ranking no tiene contexto).
- **Sí:** `HallOfFame` pasa a componente de servidor: con pestañas como enlaces ya no necesita estado, y el usuario llega por props desde la página.
- **Sí:** `getCurrentUser` envuelto en `cache()` de React para no duplicar la llamada a Supabase entre layout y página.
- **Sí:** sin juegos jugables se reutiliza el texto `▸ PRÓXIMAMENTE MÁS JUEGOS` de SPEC 08 (decisión tomada al redactar, no preguntada; caso hoy imposible).
- **Sí:** se eliminan `seededScores` y `PLAYERS`, que solo usaba el Salón de la Fama.
- **Sí:** verificación con `build` + `lint` + checklist manual + comprobaciones por MCP. Sigue sin framework de tests.

---

## Riesgos

| Riesgo                                                                                    | Mitigación                                                                                                                     |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `get_player_best` recorre todas las marcas del juego para calcular un rango               | Aceptado con el volumen actual; el índice `(game_id, score desc)` ayuda. Rangos materializados quedan para otra spec.          |
| El rango de `get_player_best` y el de `get_leaderboard` divergen si una de las dos cambia | Mismo orden (`score desc, created_at asc`) documentado en ambas migraciones; un criterio de aceptación compara los dos.        |
| Dos RPCs secuenciales (ranking → mejor marca) alargan la respuesta con sesión             | `getLeaderboard` y `getCurrentUser` van en paralelo; solo `getPlayerBest` espera. Una RPC extra por petición, aceptable.       |
| Cambiar de pestaña hace una navegación de servidor completa                               | Con un único juego jugable hoy no se nota; `scroll={false}` evita el salto. Si molesta con más juegos, se revisa en otra spec. |
| `searchParams.game` puede llegar como array (`?game=a&game=b`)                            | Solo se acepta `string`; cualquier otro valor cae al primer jugable.                                                           |

---

## Lo que **no** entra en esta spec

- Landing con datos reales.
- Filtrar la landing o el detalle por juegos jugables.
- Rankings por periodo o globales.
- Paginación o más de 20 filas.
- Perfil público de jugador.
- Caché, revalidación o realtime.
- Tests automáticos.

Cada uno de estos puntos, si llega, va en su propia spec.

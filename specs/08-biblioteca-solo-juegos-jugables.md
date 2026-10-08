# SPEC 08 — La biblioteca solo muestra los juegos jugables

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-10-07
> **Objetivo:** Que `/games` liste únicamente los juegos que tienen motor implementado (`isPlayable`), con chips de categoría limitados a las categorías que tienen algún juego y un estado vacío propio si no hay ninguno.

---

## Por qué existe esta spec

La tabla `public.games` (SPEC 06) tiene 8 juegos, pero solo ROCAS tiene motor (`PLAYABLE_GAME_IDS = ["rocas"]` en `lib/engines/ids.ts`).
La biblioteca muestra los 8. El usuario entra en juegos que no puede jugar, y los chips PUZZLE, ARCADE y VERSUS llevan a tarjetas sin motor.
Esta spec hace que la biblioteca enseñe solo lo que de verdad se puede jugar. Cuando se registre un motor nuevo, el juego aparecerá solo, sin tocar la BD.

---

## Alcance

**Dentro:**

- **Filtro en `app/games/page.tsx`**: `getGames()` sigue devolviendo los 8 juegos y la página los filtra con `isPlayable(g.id)` antes de pasarlos a `<Library games={…} />`. `getAllGameStats()` no cambia: `Library` solo consulta las estadísticas de los juegos que recibe.
- **Chips dinámicos en `components/library.tsx`**: se muestran `TODOS` y las categorías de `CATS` con al menos un juego en la prop `games`, en el orden de `CATS`. Con los datos de hoy: `TODOS` + `SHOOTER`.
- **Estado vacío propio en `Library`**: si `games` llega vacío (no hay ningún juego jugable), se muestra `▸ PRÓXIMAMENTE MÁS JUEGOS` en lugar de la rejilla y se ocultan la búsqueda y los chips. Es distinto de `NO HAY RESULTADOS`, que se sigue usando cuando la búsqueda o la categoría no encuentran nada.
- CSS del estado vacío en `app/globals.css`, diseñado con `/frontend-design` siguiendo el estilo existente (estado vacío del leaderboard de SPEC 06 y bloque `NO HAY RESULTADOS`).

**Fuera de alcance (para futuras specs):**

- Landing (`/`): la vista previa sigue con `games.slice(0, 6)` de los 8 juegos.
- Salón de la Fama: las pestañas siguen siendo las 8.
- Detalle `/games/[id]` y `/games/[id]/play` de juegos sin motor: se siguen viendo por URL directa, igual que ahora.
- Columna `playable`/`published` en `games` o borrar filas de la BD.
- Cambios en `getGames()`, `lib/catalog.ts`, `getAllGameStats()` o la RPC `get_game_stats`.
- Implementar motores nuevos.
- Tests automáticos.

---

## Modelo de datos

No hay datos nuevos: no hay migraciones, tipos regenerados ni estructuras nuevas.
Se reutilizan `isPlayable` (`lib/engines/ids.ts`, apto para cliente y servidor) y `CATS` (`lib/games.ts`).

### Página `app/games/page.tsx`

```ts
const [games, stats] = await Promise.all([getGames(), getAllGameStats()]);
const playable = games.filter((g) => isPlayable(g.id));
// <Library games={playable} stats={stats} />
```

### `Library` (`components/library.tsx`)

La firma de props no cambia: `{ games: Game[]; stats: Record<string, GameStats> | null }`.

```ts
// TODOS + categorías con al menos un juego, en el orden de CATS
const cats = useMemo(
  () => CATS.filter((c) => c === "TODOS" || games.some((g) => g.cat === c)),
  [games],
);
```

| Situación                                        | Muestra                                                  |
| ------------------------------------------------ | -------------------------------------------------------- |
| `games` vacío                                    | `▸ PRÓXIMAMENTE MÁS JUEGOS` (sin búsqueda ni chips)      |
| `games` con juegos y el filtro sin coincidencias | Búsqueda + chips + `NO HAY RESULTADOS` (igual que ahora) |
| `games` con juegos y coincidencias               | Búsqueda + chips + rejilla de `GameCard`                 |

---

## Plan de implementación

1. **Filtro en la página.**
   - En `app/games/page.tsx`, importar `isPlayable` de `@/lib/engines/ids` y pasar a `Library` solo los juegos jugables.
   - Verificar: `/games` muestra solo ROCAS, con su MEJOR PUNTUACIÓN real.
2. **Chips dinámicos.**
   - En `components/library.tsx`, calcular `cats` a partir de `games` y pintar los chips desde `cats` en lugar de `CATS`.
   - Verificar: solo se ven `TODOS` y `SHOOTER`, y ambos muestran ROCAS.
3. **Estado vacío.** Ejecutar `/frontend-design` para el bloque `▸ PRÓXIMAMENTE MÁS JUEGOS`.
   - En `Library`, si `games.length === 0`, renderizar el estado vacío sin `av-filters` ni `av-grid`.
   - CSS en `app/globals.css`.
   - Verificar cambiando temporalmente el filtro de la página por `() => false` (se revierte después).
4. **Cierre.**
   - Recorrer los criterios de aceptación.
   - `npm run lint` y `npm run build` pasan.

---

## Criterios de aceptación

- [x] `npm run build` termina sin errores ni warnings de tipos.
- [x] `npm run lint` termina sin errores.
- [x] La consola del navegador no muestra errores ni avisos de hidratación en `/games`.
- [x] `/games` muestra una sola tarjeta: ROCAS, con la MEJOR PUNTUACIÓN real de SPEC 07.
- [x] Los chips visibles son exactamente `TODOS` y `SHOOTER`, en ese orden.
- [x] Buscar `rocas` muestra ROCAS; buscar `caida` muestra `NO HAY RESULTADOS`.
- [x] Con el filtro de la página forzado a `() => false`, `/games` muestra `▸ PRÓXIMAMENTE MÁS JUEGOS`, no muestra la búsqueda ni los chips, y el hero se sigue viendo. El cambio se revierte después.
- [x] La BD sigue teniendo los 8 juegos (`select count(*) from games` = 8) y no hay migraciones nuevas.
- [x] La landing sigue mostrando 6 mini tarjetas y el Salón de la Fama sigue mostrando 8 pestañas.
- [x] `/games/caida` sigue respondiendo como antes (no devuelve 404).
- [x] Si falla `getAllGameStats`, la tarjeta de ROCAS muestra `—` y la página se renderiza normal (comportamiento de SPEC 07 intacto).

---

## Decisiones

- **Sí:** «juego real» = tiene motor según `isPlayable` / `PLAYABLE_GAME_IDS`. Es la misma fuente que usan `/play` y `saveScore`, y un motor nuevo aparece en la biblioteca sin tocar la BD.
- **No:** columna `playable`/`published` en `games`. Duplicaría `ENGINES` y podría desincronizarse; SPEC 06 ya la descartó.
- **No:** borrar las 7 filas sin motor de la BD. Los textos del catálogo se conservan para cuando esos motores existan.
- **Sí:** filtrar en la página (servidor) y no dentro de `Library`. `Library` sigue siendo un componente genérico que pinta lo que recibe.
- **Sí:** filtro solo en `/games`. La landing, el Salón de la Fama y el detalle quedan como están; si se quieren filtrar, irá en otra spec.
- **Sí:** chips limitados a `TODOS` y las categorías con algún juego, en el orden de `CATS`. Así no hay chips que lleven siempre a una lista vacía.
- **Sí:** estado vacío propio (`▸ PRÓXIMAMENTE MÁS JUEGOS`) que oculta búsqueda y chips, porque no hay nada que filtrar. `NO HAY RESULTADOS` queda para cuando el filtro no encuentra coincidencias.
- **Sí:** verificación con `build` + `lint` + checklist manual. Sigue sin framework de tests.

---

## Riesgos

| Riesgo                                                                                        | Mitigación                                                                                                       |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Incoherencia: la landing y el Salón de la Fama enlazan a juegos que la biblioteca ya no lista | Aceptado y explícito en «Fuera de alcance». Se resolverá en una spec propia si se decide filtrar esas pantallas. |
| Un chip seleccionado desaparece si cambia la prop `games`                                     | `games` solo cambia al navegar (viene del servidor), lo que remonta `Library` y devuelve el estado a `TODOS`.    |
| Un id en `PLAYABLE_GAME_IDS` sin fila en `games` no aparecería                                | El filtro parte de `getGames()`, así que nunca se muestra un juego inexistente; la FK de `scores` ya lo exige.   |

---

## Lo que **no** entra en esta spec

- Filtrar la landing, el Salón de la Fama o el detalle.
- Columna de publicación en la BD o borrado de juegos.
- Motores nuevos.
- Tests automáticos.

Cada uno de estos puntos, si llega, va en su propia spec.

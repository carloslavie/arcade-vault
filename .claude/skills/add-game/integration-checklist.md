# Integration checklist — making a game playable in Arcade Vault

Distilled from SPEC 05 (engine + `scores`), SPEC 06 (`games` + leaderboard), SPEC 07 (real stats), SPEC 08 (library shows only playable games), SPEC 09 (real Hall of Fame) and the `rocas → asteroids` rename migrations. Always confirm against the current code before writing the spec.

## How a game becomes playable (the chain)

```
public.games row (id)  ──FK──  public.scores.game_id
        │
lib/engines/ids.ts      PLAYABLE_GAME_IDS includes id  → isPlayable(id)
lib/engines/index.ts    ENGINES[id] = createXGame       (Record keeps both in sync)
lib/engines/meta.ts     GAME_META[id] = { scoreStep, … } (after platform preparation)
        │
isPlayable(id) unlocks, with no extra code:
  /games            library card (SPEC 08)
  /games/[id]       real leaderboard via get_leaderboard + stats via get_game_stats (SPEC 06/07)
  /games/[id]/play  EnginePlayer instead of the mock GamePlayer
  saveScore         validateScore accepts the id
  /hall-of-fame     tab, podium, top 20 and "TU MEJOR MARCA" (SPEC 09)
```

## Files a new game creates or touches

| File                                    | Change                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `lib/engines/<id>/entities.ts`          | New. Entities/pieces with the original constants; `draw(ctx, palette)` instead of globals.                 |
| `lib/engines/<id>/engine.ts`            | New. `create<Name>Game: GameFactory`. State, input, rAF loop, collisions, levels, render.                  |
| `lib/engines/<id>/levels.ts` (optional) | New, if the source has level data (`levels.js`).                                                           |
| `lib/engines/ids.ts`                    | Add `<id>` to `PLAYABLE_GAME_IDS`.                                                                         |
| `lib/engines/index.ts`                  | Add `<id>: create<Name>Game` to `ENGINES`.                                                                 |
| `lib/engines/meta.ts`                   | Add `<id>` entry (score step, initial lives, HUD stats, controls).                                         |
| `supabase/migrations/<ts>_<...>.sql`    | Insert a new `games` row **or** rename a mock row (see below).                                             |
| `lib/supabase/database.types.ts`        | Regenerate with `npm run db:types` only if the migration changes the schema (a data-only insert does not). |
| `app/globals.css`                       | Only if the game needs a new `.cover-*` or game-specific overlay CSS. Design with `/frontend-design`.      |
| `public/games/<id>/…` (optional)        | Only if the game ships assets (sprite sheets, images). Sounds are out of scope unless the user says so.    |

## Already generic — do NOT touch (unless the spec explicitly needs it)

- `app/games/[id]/play/actions.ts` → `saveScore` (validates with `validateScore`, user from session, RLS insert).
- `app/games/[id]/play/page.tsx` → picks `EnginePlayer` vs `GamePlayer` with `isPlayable`.
- `lib/leaderboard.ts`, `get_leaderboard` RPC, `get_game_stats` RPC, `get_player_best` RPC.
- `app/games/page.tsx`, `app/hall-of-fame/page.tsx` (filter by `isPlayable`).
- `lib/catalog.ts` (`getGames` / `getGame`).
- `public.scores` table and its RLS.

Never propose a per-game table, a per-game action or a per-game RPC.

## Catalog migration

Migration file name: `supabase/migrations/<YYYYMMDDHHMMSS>_<verb>_<id>.sql`, timestamp later than the last existing one. Applied with `npx supabase db push` (or the MCP `apply_migration`).

**New row** — columns: `id, title, short, long, cat, cover, color, difficulty, sort_order` (`sort_order` unique → next free value; `cat` in `ARCADE|PUZZLE|SHOOTER|VERSUS`; `color` in `cyan|magenta|yellow|green`; `difficulty` 1–5). Escape `'` as `''`.

**Reusing a mock row** — pattern of `20261008130000_rename_rocas_to_asteroids.sql` and `20261008140000_rename_rocas_id_to_asteroids.sql`:

```sql
-- The FK has no on update cascade, so drop it, move both sides, then restore it.
alter table public.scores drop constraint scores_game_id_fkey;
update public.games  set id = '<new>', title = '<TITLE>' where id = '<old>';
update public.scores set game_id = '<new>' where game_id = '<old>';
alter table public.scores
  add constraint scores_game_id_fkey
  foreign key (game_id) references public.games (id);
```

If only texts change (same id), a plain `update public.games` is enough. If the `cover` class name changes, rename the `.cover-*` rule in `app/globals.css` too.

## Platform preparation (only if still pending)

Asteroids was the first and only engine, so the platform still assumes it in some places. Check each item; include in the spec **only those still pending**, as the first steps of the plan (they must leave Asteroids working exactly as before).

1. **Per-game metadata** — `lib/engines/meta.ts`, no browser code (importable from the server):

   ```ts
   export interface GameMeta {
     scoreStep: number; // every valid score is a multiple of this (asteroids 10)
     initialLives: number | null; // null = game without lives (HUD hides Vidas)
     hud: ("lives" | "level" | "lines")[]; // extra HUD stats besides score
     controls: { keys: string[]; label: string }[]; // ready overlay table
   }
   export const GAME_META: Record<PlayableGameId, GameMeta>;
   ```

   Pending if `lib/engines/meta.ts` does not exist.

2. **`GameStats` generalised** — `lib/engines/types.ts`: if a game needs a stat other than `score/lives/level` (e.g. Tetris `lines`), add it as optional (`lines?: number`). Pending if the new game needs a stat not in `GameStats`.
3. **`EnginePlayer` reads metadata** — `components/engine-player.tsx`: `CONTROLS` and `INITIAL_STATS` (`lives: 3`) come from `GAME_META[game.id]`; HUD cells (Vidas, Nivel, Líneas) and the end modal's NIVEL render according to `hud`. Pending if `CONTROLS` / `INITIAL_STATS` are still module constants.
4. **Score step per game** — `lib/scores.ts`: `validateScore` uses `GAME_META[gameId].scoreStep` instead of `SCORE_LIMITS.step`. Pending if `SCORE_LIMITS` still has `step`. Only needed if the new game's step is not 10.
5. **Relax the DB check** — migration that drops the `score % 10 = 0` part of the `scores` CHECK (keep `score between 1 and 10000000`). Find the constraint name with MCP `execute_sql` (`select conname from pg_constraint where conrelid = 'public.scores'::regclass`) before writing it. Pending together with item 4. Then `npm run db:types` (no type change expected, but keep it consistent).

Acceptance criteria for preparation always include: "Asteroids sigue igual: controles, HUD con Vidas y Nivel, y `saveScore({ gameId: 'asteroids', score: 15 })` sigue devolviendo `invalid`".

## Standard verification (MCP + manual)

- `npm run lint` and `npm run build` pass.
- MCP `list_tables`: `games` includes the new row; `get_advisors` (security, performance) without new warnings.
- Play a full run logged in → `select * from scores order by id desc limit 1` shows `game_id = '<id>'`.
- `select * from get_leaderboard('<id>')` returns the row; `/games/<id>` shows it after reload.
- `/games` shows the card; `/hall-of-fame` shows the tab.
- Guest run → "INICIA SESIÓN PARA GUARDAR TUS PUNTUACIONES", nothing inserted.
- Strict Mode in dev → one row per run.
- Touch emulation → "REQUIERE TECLADO", engine not created.
- After SALIR / VOLVER AL VAULT, arrows scroll again and no rAF remains.

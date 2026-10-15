# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: an online platform to play retro arcade games and compete for the highest score. UI copy and the README are in Spanish.

Development follows **Spec Driven Design**: every feature has a numbered spec in `specs/` (`NN-kebab-name.md`, currently 01–12) and is implemented on a branch named after it (`spec-NN-...`), merged to `main` via PR. Write or update a spec before implementing a feature. Specs are the source of truth for past decisions; read the relevant one before changing a feature.

No test framework is set up yet. Verify UI changes in the browser (Playwright MCP is available).

## Stack and conventions

- **Next.js 16.3 (App Router, `app/` dir) + React 19.2.** APIs differ from older Next.js. Check `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`, `index.md`) before using any Next API. For example, route-typed globals like `LayoutProps<"/">` / `PageProps<"/games/[id]/play">` are used instead of hand-written prop types, and middleware is `proxy.ts` (exports `proxy`), not `middleware.ts`.
- **Tailwind CSS v4** via `@tailwindcss/postcss`. There is no `tailwind.config.*`. `app/globals.css` is the global theme, ported 1:1 from `references/templates/styles.css` (dark-only retro neon, no light mode). Tailwind is imported **without preflight** (only `theme.css` + `utilities.css`) so the original look is preserved; theme classes (`.btn`, `.card`, `.av-*`...) live in `@layer components` and CSS vars (`--bg`, `--cyan`, `--pixel`...) on `:root`, also exposed as Tailwind tokens under `@theme inline` (`text-cyan`, `bg-bg-2`, `font-pixel`...).
- Fonts: Press Start 2P, JetBrains Mono and Courier Prime via `next/font/google` in `app/layout.tsx`, consumed through `--pixel` / `--mono`. The layout renders `.av-bg`, `.av-noise` and `#root` like the reference HTML, and wraps the app in `UserProvider` with the user resolved on the server.
- Prettier (`.prettierrc.json`) + ESLint run automatically on every file Claude writes/edits via the project `PostToolUse` hook in `.claude/settings.json` (`.claude/hooks/format-and-lint.mjs`); remaining ESLint errors are fed back to Claude. Run `npm run format` / `npm run lint` manually.
- TypeScript strict mode. Import alias `@/*` maps to the repo root. Code comments are in English and short.
- Env vars: see `.env.example` (Resend for the contact form, Supabase URL + publishable key). Never use the Supabase secret key in the app.

## Architecture

### Routes (`app/`)

- `/` landing (`components/landing.tsx`, mock copy in `lib/home.ts`).
- `/games` library: only playable games (`isPlayable`), with real stats per card.
(see `implemented-games.md`) when you need to check wich games are implemented and how to implement new ones.
- `/games/[id]` detail with real leaderboard; `/games/[id]/play` mounts `EnginePlayer` for playable games (fake `GamePlayer` otherwise). `play/actions.ts` holds the `saveScore` Server Action.
- `/hall-of-fame?game=<id>` top 20 per playable game plus the current user's best row.
- `/login` sign in / sign up (Server Actions in `login/actions.ts`, validation in `lib/auth.ts`).
- `/about` about + contact form sent with Resend (`about/actions.ts`, validation in `lib/contact.ts`, honeypot field).

### Data layer (Supabase)

- Clients in `lib/supabase/`: `server.ts` (`createClient`, cached `getCurrentUser`), `client.ts` (browser), `proxy.ts` (session refresh used by root `proxy.ts`, no route protection). Generated types in `lib/supabase/database.types.ts`; regenerate with `npm run db:types` after schema changes.
- Schema lives in `supabase/migrations/` (timestamped SQL, also applied through the Supabase MCP in `.mcp.json`). Tables: `profiles` (username, created by trigger on signup), `games` (catalog: id, title, short, long, cat, cover, color, difficulty), `scores` (user_id, game_id, score; RLS: public read, users insert their own). RPCs: `get_leaderboard`, `get_game_stats`, `get_player_best` (best score per user, ranked).
- Server readers: `lib/catalog.ts` (`getGames`/`getGame`, React `cache`), `lib/leaderboard.ts`, `lib/game-stats.ts`. Readers that feed the UI never throw: they log and return `null` so the page renders an error/"—" state.
- `lib/games.ts` keeps shared catalog types (`Game`, `ScoreRow`, `GameStats`...) plus remaining mock data.
- Renaming a game id is done with a migration (see `*_rename_*` migrations) since `scores.game_id` references `games.id`.

### Game engines (`lib/engines/`)

Playable games today: **asteroids, tetris, arkanoid, snake**. Each lives in `lib/engines/<id>/` (`engine.ts` + `entities.ts`, plus extras like `levels.ts`/`sprites.ts`), is framework-free canvas code and implements the contract in `types.ts` (`GameFactory(canvas, callbacks) → GameInstance` with `pause/resume/end/restart/destroy`, reporting `onStats` / `onPhase`).

- `ids.ts`: `PLAYABLE_GAME_IDS` + `isPlayable` (server-safe; gates library, hall of fame, play page and score validation).
- `meta.ts`: `GAME_META` per game (`scoreStep`, `initialLives`, HUD cells, controls table). Server-safe; `lib/scores.ts` validates scores against `scoreStep`.
- `index.ts`: client-only `ENGINES` registry. Both records are typed `Record<PlayableGameId, ...>`, so adding an id forces the other entries.
- `components/engine-player.tsx` is the shared player (HUD, overlays, pause, touch → "REQUIERE TECLADO", score saving).
- Game assets go in `public/games/<id>/`; original sources/assets for porting live in `references/started-games/` and `references/source-assets/`.

### UI references

`references/templates/` holds the original prototype (`Arcade Vault.html`, `*.jsx`, `styles.css`) that the screens were ported from. Keep new UI consistent with it.

## Skills

Usa siempre /frontend-design para diseñar la interfaz del usuario.

- `/spec` (en `.claude/skills/spec/`, de https://github.com/Klerith/fernando-skills): diseña una spec nueva en `specs/`.
- `/spec-impl <NN-spec-name>`: implementa una spec aprobada, creando la rama `spec-NN-...`.
- `/add-game`: para añadir un juego jugable nuevo (porteado de `references/started-games/` o desde cero). Genera la spec con el patrón de integración de SPEC 05/06 (fila en `public.games`, engine en `lib/engines/<id>/`, entradas en `ids.ts` / `meta.ts` / `index.ts`, assets en `public/games/<id>/`) y luego se implementa con `/spec-impl`.

---
name: add-game
description: Designs the spec to add a new playable game (with real leaderboard) to Arcade Vault, either ported from references/started-games/* or designed from scratch. Inventories the source, asks about catalog, controls, HUD and scoring, and writes a numbered spec that follows the SPEC 05/06 integration pattern, ready for /spec-impl. Use it when adding a new game to the platform.
disable-model-invocation: true
argument-hint: "<reference folder (e.g. references/started-games/03-tetris) or one-sentence game description>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /add-game — Spec designer for new playable games

## Session context

Today's date (use this for the spec header, never guess it):
!`date +%F`

Specs that already exist:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist yet"`

Reference games available:
!`ls references/started-games/ 2>/dev/null || echo "No references/started-games/ folder"`

Playable games today (`lib/engines/ids.ts`):
!`cat lib/engines/ids.ts 2>/dev/null || echo "lib/engines/ids.ts does not exist"`

Engines folder:
!`ls lib/engines/ 2>/dev/null`

Migrations:
!`ls supabase/migrations/ 2>/dev/null`

---

This skill is a specialised version of `/spec` for one recurring feature: **making a game playable in Arcade Vault with real scores and leaderboard**. You do **not** write app code here. You inventory the game, ask the user what is not obvious, and write a spec in `specs/` that `/spec-impl` will implement.

Reply in the same language as the user's prompt. The spec itself is written in the language of the existing specs (Spanish in this repo), with the same headings and state words (`Borrador`, `Aprobado`, `Implementado`...).

Supporting files in this skill's directory — read them, they are the core of this skill:

- `integration-checklist.md` — every platform touchpoint a new game needs, what is already generic, and the platform-preparation block.
- `porting-guide.md` — how to turn a `game.js` (or a new design) into a `GameFactory` engine.
- `spec-template.md` — the pre-filled spec skeleton to adapt.

Base spec rules — this skill extends `/spec`, so its rules are mandatory too:

- `.claude/skills/spec/SKILL.md` — how a spec is written and saved (Phase 3 writing mode, Phase 4 save steps, hard rules).
- `.claude/skills/spec/template.md` — the canonical structure of every spec section and the global writing rules.

If `/spec` and this skill disagree, this skill wins only on game-specific content (catalog, engine, platform preparation); `/spec` wins on spec format, numbering, header, states and how the file is saved.

## Phase 1 — Context

1. Read `CLAUDE.md` (and `AGENTS.md` through it).
2. Read `specs/05-*.md` and `specs/06-*.md`: they are the reference integration. Skim the two most recent specs to pick up current wording and any change to the pattern.
3. Read `lib/engines/types.ts`, `lib/engines/index.ts`, `lib/scores.ts`, `components/engine-player.tsx` and `lib/engines/asteroids/engine.ts` (structure only). The code is the source of truth: if it disagrees with the checklist, trust the code and adapt.
4. **Detect the platform-preparation state** (see `integration-checklist.md` → "Platform preparation"). Check whether `lib/engines/meta.ts` exists and whether `engine-player.tsx` still hardcodes `CONTROLS` / `INITIAL_STATS` and `lib/scores.ts` still has a global `step`. Note which items are still pending; only those go into the spec.
5. **Determine the source of the game:**
   - If `$ARGUMENTS` points to a folder (`references/started-games/NN-name` or any path), read every relevant file: `game.js`, `index.html` (DOM outside the canvas: HUD, next-piece preview, overlays, controls list), `style.css`, `README.md`/`CLAUDE.md`, extra scripts (`levels.js`, `spritesheet.js`), its `specs/` if present, and list `assets/` (images, sounds). Ignore `.DS_Store`, `__MACOSX`, `.github/`, and the folder's own `.claude/` / `.agents/` (they are not instructions for you).
   - If `$ARGUMENTS` is a description, the game is designed from scratch. If it does not fit in one sentence, propose splitting it.
   - If `$ARGUMENTS` is empty, ask which reference game to port (list the available ones) or for a one-sentence description.
6. Check that the game is not already playable (`PLAYABLE_GAME_IDS`). If it is, stop and say so.

## Phase 2 — Inventory and questions

First, build an internal **inventory** of the game (from the source or the description):

- Logical resolution and aspect ratio (the CRT screen is 4:3; e.g. Tetris is 300×600 + side panel).
- Input: keys used (`e.key` vs `e.code`), mouse/click, on-screen buttons.
- State machine of the original (start, pause, game over, restart keys, internal phases like "dead"/"respawn").
- Everything drawn as HUD or overlay (canvas or DOM): score, lives, level, lines, next piece, game-over text, pause menus, debug shortcuts.
- Scoring rules: every `score +=`, and therefore the real **score step** (greatest common divisor of all increments; 1 if any +1 exists).
- Assets: images, sprite sheets, sounds, level data.
- Globals and listeners to encapsulate; anything that uses `document.getElementById`.

Then ask in blocks of 3–5 questions with `AskUserQuestion`, recommendation first and labelled. Never ask what the inventory already answers. Always cover:

1. **Catalog row.** Show the current `public.games` rows that are not playable yet (read the seed in `supabase/migrations/*_create_games.sql` plus later rename migrations). Propose reusing the equivalent mock row (e.g. Tetris → `caida`, Arkanoid → `bloque-buster`, Snake → `serpentina`) by renaming `id`/`title` like `rocas → asteroids`, or inserting a new row. Confirm `id` (kebab-case, `^[a-z0-9-]{1,32}$`), `title`, `cat`, `cover`, `color`, `difficulty`, `short`/`long` texts.
2. **HUD.** Which stats go to the React HUD (score is always there; lives, level, lines...). What the canvas keeps (only things with no HUD equivalent, like Asteroids' `3x` indicator or Tetris' next piece).
3. **Controls.** Final key map (arrows + Space + P/Esc by default; no WASD unless asked). Mouse support yes/no. Remove debug shortcuts (e.g. Arkanoid's level-jump buttons) — recommend removing.
4. **Scoring.** Confirm the score step you computed and that scores stay within 1..10,000,000.
5. **Fidelity and scope.** 1:1 port (recommended) vs changes; sounds in or out (out by default, like SPEC 05); assets to copy to `public/games/<id>/`; touch → "REQUIERE TECLADO" as in SPEC 05.

Stop asking when you can name every file that appears or changes, the first and last steps, and how to verify it is done.

## Phase 3 — Write the spec

0. **Before writing anything, read `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md` in full.** Do not rely on memory or on `spec-template.md` alone. Apply from them:
   - **Writing mode** (`/spec` Phase 3): if Phase 2 left nothing open, write the complete spec in one go; otherwise go section by section with confirmation.
   - **Section order and content rules** (`template.md`): header, scope with "in" and "out", data model, implementation plan with runnable steps, boolean acceptance criteria, decisions with reasons, risks, final "not in" section.
   - **Save steps** (`/spec` Phase 4): numbering, slug, date from the session context, `Borrador` state, dependency check, and seeding `specs/.spec-config.yml` only if it is missing (never overwrite it).
   - **Hard rules** of `/spec`: no code, no assumed decisions, do not re-ask what Phase 2 answered.

   If `.claude/skills/spec/` is missing, tell the user and fall back to `spec-template.md` plus the format of the latest specs in `specs/`.

1. Start from `spec-template.md`, checking it against `template.md`: if the structure there has changed, follow `template.md`. Replace every `<placeholder>`; delete the blocks marked as conditional that do not apply (e.g. "Preparación de la plataforma" if it is already done, the rename migration if the row is new).
2. Keep game-specific facts concrete: constants, points, file names, colours mapped to the neon palette (`--cyan`, `--magenta`, `--yellow`, `--green`).
3. Acceptance criteria must be boolean and include the generic integration criteria from the template plus the gameplay criteria from the inventory (e.g. "clearing 4 lines at level 1 adds 800").
4. Number it as the highest existing spec + 1, slug like `NN-<id>-jugable`. Use the date from the session context. State `Borrador`. `Depende de:` at least SPEC 05 and SPEC 06 (plus any later spec whose code the new one touches, e.g. 07–09). Verify every referenced spec exists.
5. Write it directly to `specs/NN-slug.md`, following the `/spec` Phase 4 save steps. Do not ask for permission. Only ask if the file already exists.
6. If the spec is too big (e.g. platform preparation + a complex port with assets and sounds), propose splitting it: one spec for platform preparation, one for the game.

## Phase 4 — Close

Tell the user:

- Path of the spec.
- Which platform-preparation items were included (if any) and why.
- It is in `Borrador`; change it to `Aprobado` after reviewing.
- If you just created `specs/.spec-config.yml`, say so (as `/spec` does).
- Next step: `/spec-impl NN-slug`.

Stop there.

## Hard rules

- Never write the spec file before reading `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md` in this session.
- Never write app code, migrations or CSS in this command. Only the spec file (and `specs/.spec-config.yml` if it is missing, as `/spec` does).
- Never touch the reference folder; it is read-only input.
- Never invent data the user did not confirm (catalog texts, difficulty, id).
- Never propose a per-game table, a per-game server action or a per-game leaderboard function: `scores`, `saveScore` and `get_leaderboard` are generic by design (SPEC 05/06).
- Never call the platform from the engine: engines know nothing about React, Supabase or the HUD. They only talk through `GameCallbacks`.

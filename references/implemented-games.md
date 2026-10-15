# Juegos implementados

Juegos jugables de Arcade Vault: tienen motor real en `lib/engines/<id>/`, están en `PLAYABLE_GAME_IDS` (`lib/engines/ids.ts`) y guardan puntuaciones en `public.scores`.

Datos del catálogo sacados de `public.games` en Supabase. Partidas y récord a fecha **2026-10-15**.

| #   | ID          | Título    | Categoría | Color   | Dificultad | Spec    | Partidas | Récord |
| --- | ----------- | --------- | --------- | ------- | ---------- | ------- | -------- | ------ |
| 1   | `asteroids` | ASTEROIDS | SHOOTER   | yellow  | 4/5        | SPEC 05 | 12       | 15600  |
| 2   | `tetris`    | TETRIS    | PUZZLE    | magenta | 3/5        | SPEC 10 | 1        | 449    |
| 3   | `arkanoid`  | ARKANOID  | ARCADE    | cyan    | 2/5        | SPEC 11 | 3        | 320    |
| 4   | `snake`     | SNAKE     | ARCADE    | green   | 2/5        | SPEC 12 | 3        | 370    |

---

## ASTEROIDS

- **ID / ruta:** `asteroids` → `/games/asteroids`
- **Categoría:** SHOOTER · **Color:** yellow · **Dificultad:** 4/5 · **Portada:** `cover-rocas`
- **Spec:** `specs/05-asteroides-jugable-y-puntuaciones-en-supabase.md` (antes `rocas` / ROCAS)
- **Motor:** `lib/engines/asteroids/` (`engine.ts`, `entities.ts`)
- **Reglas de puntuación:** múltiplos de 10 · 3 vidas · HUD: vidas, nivel
- **Controles:** ← → rotar · ↑ propulsar · ESPACIO disparar · P / ESC pausa
- **Resumen:** Pulveriza asteroides en gravedad cero.
- **Descripción:** Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.

## TETRIS

- **ID / ruta:** `tetris` → `/games/tetris`
- **Categoría:** PUZZLE · **Color:** magenta · **Dificultad:** 3/5 · **Portada:** `cover-tetro`
- **Spec:** `specs/10-tetris-jugable.md` (antes `caida`)
- **Motor:** `lib/engines/tetris/` (`engine.ts`, `entities.ts`)
- **Reglas de puntuación:** paso 1 · sin vidas · HUD: líneas, nivel
- **Controles:** ← → mover · ↑ rotar · ↓ bajar · ESPACIO caída · P / ESC pausa
- **Resumen:** Encaja las piezas antes de que el techo te aplaste.
- **Descripción:** Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.

## ARKANOID

- **ID / ruta:** `arkanoid` → `/games/arkanoid`
- **Categoría:** ARCADE · **Color:** cyan · **Dificultad:** 2/5 · **Portada:** `cover-bricks`
- **Spec:** `specs/11-arkanoid-jugable.md` (antes `bloque-buster`)
- **Motor:** `lib/engines/arkanoid/` (`engine.ts`, `entities.ts`, `levels.ts`)
- **Reglas de puntuación:** múltiplos de 10 · 3 vidas · HUD: vidas, nivel
- **Controles:** ← → / RATÓN mover · P / ESC pausa
- **Resumen:** Rebota la pelota y destruye muros de neón.
- **Descripción:** Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?

## SNAKE

- **ID / ruta:** `snake` → `/games/snake`
- **Categoría:** ARCADE · **Color:** green · **Dificultad:** 2/5 · **Portada:** `cover-snake`
- **Spec:** `specs/12-snake-jugable.md` (antes `serpentina`)
- **Motor:** `lib/engines/snake/` (`engine.ts`, `entities.ts`, `sprites.ts`) · assets en `public/games/snake/`
- **Reglas de puntuación:** múltiplos de 10 · sin vidas · HUD: nivel
- **Controles:** ← ↑ → ↓ mover · P / ESC pausa
- **Resumen:** Crece sin morder tu propia cola.
- **Descripción:** Una serpiente de luz recorre la grilla devorando frutas pixeladas. Cada bocado la alarga y cada cinco la hace más veloz. Un choque contra el muro o contra su propia cola y se acabó.

---

## En el catálogo, sin implementar

Estas filas existen en `public.games` pero no tienen motor, así que no salen en la biblioteca ni en el Salón de la Fama: `duelo-pixel` (DUELO PIXEL), `gloton` (GLOTÓN), `invasores` (INVASORES), `ranaria` (RANARIA).

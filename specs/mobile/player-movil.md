# MÓVIL · Player táctil (HUD, alto de pantalla y modal de fin)

> **Estado:** Borrador
> **Depende de:** SPEC 13, SPEC 18, `specs/mobile/nav-movil.md`, `specs/mobile/base-movil.md`
> **Fecha:** 2026-10-19
> **Objetivo:** Que en `/games/{asteroids,tetris,arkanoid,snake}/play` en táctil, HUD, CRT y mando quepan en `100dvh` en vertical y horizontal con objetivos de 44 px, y que el modal de fin sea usable en móvil horizontal.

---

## Por qué existe esta spec

SPEC 18 pide que en horizontal "HUD + CRT quepan en `100dvh`" y que el mando quede bajo la CRT en vertical.
La CRT horizontal se calcula con `calc((100dvh - 150px) * 4 / 3 + 24px)`, que supone un HUD de una sola fila y **sin** la nav.
En la práctica el HUD ocupa 2 filas (estadísticas y botones), la nav es `sticky` y se come 66 px de los 390 px, y la CRT termina fuera de pantalla.
En vertical, el HUD hace wrap en 4–5 filas (hasta 299 px), y el mando queda por debajo del borde inferior.
Como el mando y la CRT tienen `touch-action: none`, para ver el mando hay que hacer scroll arrastrando desde el HUD.

SPEC 18 está `Implementado` y sus decisiones no cambian: mando por `.av-player.is-touch`, grupos a los lados de la CRT en horizontal, sin bloquear orientación ni mostrar "GIRA EL DISPOSITIVO".
Esta spec corrige el reparto de alto que SPEC 18 daba por cumplido.

Las medidas con la nav corregida se tomaron inyectando el CSS de `nav-movil.md` en la página, sin tocar el repo.

---

## Problemas detectados

| Ruta                      | Viewport            | Evidencia medida                                                                                                                                                                                            | Causa (selector y archivo)                                                                                                                                                   |
| ------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/games/tetris/play`      | `movil-h` (844×390) | Con la nav ya en hamburguesa (66 px): HUD en y 74–167, CRT en y 175–465. La CRT acaba 75 px por debajo de la ventana. Visible bajo la nav sticky: 324 px; HUD + CRT necesitan 391 px                        | `.touch-stage .crt { width: min(100%, calc((100dvh - 150px) * 4 / 3 + 24px)) }` no cuenta la nav ni un HUD de 2 filas. `.av-nav { position: sticky }`. `app/globals.css`     |
| `/games/snake/play`       | `movil-h`           | HUD 51 px (una fila), CRT en y 133–423: 33 px fuera                                                                                                                                                         | Igual que arriba                                                                                                                                                             |
| 4 juegos                  | `movil-h`           | `PAUSA` 78×32, `FIN` 57×32, `PANTALLA COMPLETA` 203×32, `SALIR` 78×32                                                                                                                                       | `@media (orientation: landscape) { .is-touch .hud-actions .btn { padding: 8px 12px; font-size: 9px } }`                                                                      |
| `/games/tetris/play`      | `movil-v` (390×844) | HUD de 299 px: estadísticas en 2 filas (110 px) y botones en 3 filas (143 px). CRT en y 430–741. Botón `ArrowDown` del mando termina en y 887 (43 px por debajo de 844)                                     | `.player-hud { flex-wrap: wrap }`, `.hud-stat .v { font-size: 16px }`, `gap: 24px` inline en `components/engine-player.tsx`; `PANTALLA COMPLETA` de 239 px en su propia fila |
| `/games/snake/play`       | `movil-v`           | HUD de 232 px. Cruceta termina en y 880                                                                                                                                                                     | Igual que arriba                                                                                                                                                             |
| 4 juegos                  | `pequeno` (360×640) | HUD de 299 px (Tetris). CRT en y 430–738: empieza en el borde inferior de la ventana; el mando termina en y 884                                                                                             | Igual que arriba                                                                                                                                                             |
| `/games/snake/play`       | `tablet` (768×1024) | `ArrowDown` de la cruceta en y 978–1034: 10 px fuera de la ventana                                                                                                                                          | En vertical la CRT ocupa todo el ancho (720 px, 582 px de alto) sin tope de alto                                                                                             |
| 4 juegos                  | 4 táctiles          | Botones del selector de skin `CLÁSICO` 81×26, `NEÓN` 53×26, `RETRO` 62×26                                                                                                                                   | `.is-touch .skin-opt { padding: 6px 7px }`, `.skin-opt { font-size: 8px }`                                                                                                   |
| 4 juegos                  | 4 táctiles          | `SEÑAL OK` y botones de skin a 8 px. `TOCA PARA EMPEZAR` a 9 px en 390 px                                                                                                                                   | `.crt-bottom { font-size: 8px }`, `.skin-opt { font-size: 8px }`, `.crt-overlay .prompt { font-size: clamp(9px, 1.4vw, 12px) }`                                              |
| `/games/snake/play` (FIN) | `movil-h`           | Modal `FIN DEL JUEGO` de invitado: 440 px de alto en una ventana de 390 px. `.modal-bd` con `overflow-y: visible` y `position: fixed`: la parte superior e inferior quedan cortadas y no se pueden alcanzar | `.modal-bd { align-items: center }` sin scroll y `.modal { padding: 32px }`, `.modal .final { font-size: 36px }`                                                             |

Sin problemas (criterios de SPEC 18 comprobados): en los 4 viewports táctiles no aparece `REQUIERE TECLADO`, el overlay dice `TOCA PARA EMPEZAR`, el mando tiene exactamente los botones de `GAME_META.touch` con 56×56 (flechas) y 64×64 / 72×72 (acción), aparece `PANTALLA COMPLETA` y el selector de skin cabe sin desbordar.
En `desktop` no hay mando, el overlay es `PULSA ESPACIO PARA EMPEZAR` y no hay errores de consola.

---

## Alcance

**Dentro:**

- **Vertical** (`@media (orientation: portrait)` con `.av-player.is-touch`):
  - `.av-player.is-touch` con `margin-top: 12px`.
  - Estadísticas del HUD en una sola fila: `gap: 14px` y `.hud-stat .v` a 12 px.
  - `.hud-actions` como rejilla de 3 columnas a todo el ancho: `PAUSA`, `FIN`, `SALIR` en la primera fila y `PANTALLA COMPLETA` ocupando la fila entera debajo.
  - Tope de ancho de la CRT para tablets: `.touch-stage .crt { width: min(100%, max(320px, calc((100dvh - 560px) * 4 / 3 + 24px))); margin-inline: auto }`. En móvil sigue a todo el ancho; en tablet encoge lo justo para que el mando quepa.
- **Horizontal** (`@media (orientation: landscape)` con `.av-player.is-touch`):
  - La nav deja de ser `sticky` mientras hay un player táctil: `body:has(.av-player.is-touch) .av-nav { position: relative }`.
  - Al tocar `TOCA PARA EMPEZAR`, `EnginePlayer` hace `scrollIntoView({ block: "start" })` sobre `.av-player` (instantáneo con movimiento reducido), así la nav sale de la vista y el player ocupa la ventana.
  - El HUD pasa a las columnas laterales, que hoy solo tienen el mando y les sobran ~180 px de ancho:
    - `.av-player.is-touch` es una rejilla `1fr auto 1fr` con áreas `"stats crt actions"` / `"left crt right"`.
    - `.player-hud`, `.touch-stage` y `.touch-pad` pasan a `display: contents`.
    - Columna izquierda: estadísticas en rejilla de 2×2 encima del grupo izquierdo del mando.
    - Columna derecha: botones del HUD en rejilla de 2 columnas (`PANTALLA COMPLETA` ocupa las 2 y puede partir en 2 líneas) encima del grupo derecho.
  - `.av-player.is-touch` con `margin: 0 auto`, `padding: 8px 16px` y `min-height: 100dvh`.
  - La CRT se calcula solo con lo que queda en vertical: `calc((100dvh - 100px) * 4 / 3 + 24px)`, donde 100 px = 16 px de padding + 24 px de bisel + 60 px de `.crt-bottom` con skin.
- **Objetivos táctiles en ambas orientaciones:** `.is-touch .hud-actions .btn` y `.is-touch .skin-opt` con `min-height: 44px`; `.is-touch .skin-opt` también con `min-width: 44px`. Se elimina el `padding: 8px 12px` de los botones del HUD en horizontal.
- **Texto:** `.is-touch .crt-bottom` y `.is-touch .skin-opt` a 10 px. `.crt-overlay .prompt` a `clamp(10px, 1.4vw, 12px)`.
- **Modal de fin** (también fuera de táctil):
  - `.modal-bd { overflow-y: auto; align-items: safe center }`.
  - `@media (max-height: 500px)`: `.modal { padding: 20px }`, `.modal h2 { margin-bottom: 10px }`, `.modal .final { font-size: 28px; margin: 8px 0 4px }`.
- `components/engine-player.tsx`: clase `hud-fullscreen` en el botón de pantalla completa (para colocarlo en la rejilla) y el `scrollIntoView` del overlay de inicio. Ningún otro cambio de lógica.
- Diseño con `/frontend-design`, coherente con `references/templates/styles.css` y con el mueble arcade de SPEC 18 (bisel `#1b1b22` / `#2a2a35`, glow `--cyan` / `--magenta`).

**Fuera de alcance (para futuras specs):**

- Gestos, bloqueo de orientación o aviso de "GIRA EL DISPOSITIVO" (decisiones de SPEC 18).
- Cambiar el texto `PANTALLA COMPLETA` / `SALIR PANTALLA COMPLETA`.
- Mando configurable o reposicionable, y tamaños de los botones del mando.
- Reglas, velocidades o puntuación de los juegos.
- `env(safe-area-inset-*)` para muescas en horizontal.
- El player de escritorio y el `GamePlayer` falso de juegos no jugables.

---

## Plan de implementación

1. **Objetivos y textos.** En `app/globals.css`: `min-height: 44px` en `.is-touch .hud-actions .btn` y `.is-touch .skin-opt` (más `min-width: 44px` en `.skin-opt`), tamaños de 10 px en `.is-touch .crt-bottom` y `.is-touch .skin-opt`, `clamp(10px, 1.4vw, 12px)` en `.crt-overlay .prompt`. Quitar `padding: 8px 12px; font-size: 9px` de `.is-touch .hud-actions .btn` en horizontal.
2. **Modal de fin.** `.modal-bd` con `overflow-y: auto` y `align-items: safe center`, y el bloque `@media (max-height: 500px)`. Comprobar en 844×390 pulsando FIN como invitado que se alcanza `VOLVER AL VAULT` con scroll.
3. **HUD vertical.** Clase `hud-fullscreen` en el botón de `components/engine-player.tsx`. En `globals.css`, bloque `@media (orientation: portrait)` con las estadísticas en una fila y `.hud-actions` en rejilla de 3 columnas. Comprobar en 390×844 que `.player-hud` mide ≤ 170 px.
4. **Tope de la CRT en vertical.** Regla de `width` de `.touch-stage .crt` en vertical. Comprobar en 768×1024 que el último botón del mando de Snake termina antes de y 1024 y que en 390 px la CRT sigue a todo el ancho.
5. **Nav en horizontal.** `body:has(.av-player.is-touch) .av-nav { position: relative }` dentro de `@media (orientation: landscape)`, y `scrollIntoView` en el `onClick` del overlay `tap-start` de `components/engine-player.tsx`, solo si `matchMedia("(orientation: landscape)").matches`.
6. **Rejilla horizontal.** Con `/frontend-design`: `.av-player.is-touch` en rejilla de áreas, `display: contents` en `.player-hud`, `.touch-stage` y `.touch-pad`, estadísticas 2×2 a la izquierda y acciones 2 columnas a la derecha, y la nueva fórmula de ancho de la CRT. Comprobar los 4 juegos en 844×390.

---

## Criterios de aceptación

- [ ] Sin scroll horizontal en `movil-v`, `movil-h`, `pequeno` y `tablet` en los 4 `/games/{id}/play` (con `nav-movil.md` ya aplicada).
- [ ] En 844×390, tras tocar `TOCA PARA EMPEZAR`, las celdas del HUD, los botones `PAUSA` / `FIN` / `SALIR` / `PANTALLA COMPLETA`, la CRT y todos los botones del mando tienen `top ≥ 0` y `bottom ≤ 390`, en los 4 juegos.
- [ ] En 844×390, los grupos del mando siguen a izquierda y derecha de la CRT (SPEC 18) y la CRT mide al menos 300 px de ancho.
- [ ] En 390×844, `.player-hud` mide como máximo 170 px de alto y, con la página arriba del todo, el último botón del mando tiene `bottom ≤ 844` en los 4 juegos.
- [ ] En 360×640, la distancia entre el `top` de `.crt` y el `bottom` del último botón del mando es ≤ 640 − alto de `.av-nav`, en los 4 juegos.
- [ ] En 768×1024, con la página arriba del todo, el último botón del mando tiene `bottom ≤ 1024` en los 4 juegos.
- [ ] En los 4 viewports táctiles, `PAUSA`, `FIN`, `SALIR`, `PANTALLA COMPLETA` y los 3 botones de skin miden al menos 44×44 px y están separados al menos 8 px.
- [ ] En los 4 viewports táctiles, `SEÑAL OK`, los botones de skin y `TOCA PARA EMPEZAR` calculan `font-size` ≥ 10 px.
- [ ] En 844×390, el modal `FIN DEL JUEGO` de invitado permite llegar con scroll a `INICIAR SESIÓN`, `JUGAR DE NUEVO` y `VOLVER AL VAULT`.
- [ ] Siguen cumpliéndose los criterios de SPEC 18: sin `REQUIERE TECLADO`, `TOCA PARA EMPEZAR` empieza la partida, mando con los botones de `GAME_META.touch`, botones del mando ≥ 56×56 px y cambiar de skin no reinicia la partida.
- [ ] En `desktop` no hay cambios visuales: en 1440×900 no aparece el mando, el HUD está en una fila encima de la CRT, el overlay dice `PULSA ESPACIO PARA EMPEZAR` y el modal de fin se ve igual.
- [ ] La consola no muestra errores en ninguna ruta ni viewport.

---

## Decisiones

- **Sí:** HUD en las columnas laterales en horizontal. Las columnas tienen ~180 px libres y así la CRT puede usar casi toda la altura. Los grupos del mando siguen a los lados, como decidió SPEC 18.
- **No:** encoger la CRT para que quepa un HUD de 2 filas encima. Con botones de 44 px la pantalla bajaría a ~185 px de alto.
- **No:** ocultar la celda `JUGADOR` o acortar `PANTALLA COMPLETA`. Es contenido y texto fijados por SPEC 05 y SPEC 18.
- **Sí:** nav no `sticky` mientras hay un player táctil en horizontal, con la clase `.is-touch` vía `:has()`. 66 px de 390 son el 17 % de la pantalla. En vertical sigue `sticky` porque sobra alto.
- **Sí:** `scrollIntoView` al empezar en horizontal. Deja la partida encuadrada sin que el jugador tenga que hacer scroll desde el HUD.
- **No:** ocultar la nav del todo en `/play`. Quitaría la navegación en vertical y en escritorio.
- **Sí:** tope de ancho de la CRT en vertical con suelo de 320 px. Solo encoge en pantallas altas (tablet); en 360–390 px la CRT sigue a todo el ancho.
- **Sí:** `@media (max-height: 500px)` para el modal. El problema es de alto y afecta también a ventanas de escritorio bajas; no depende de táctil.
- **No:** tocar los botones del mando (56/64/72 px) ni su disposición. Ya cumplen SPEC 18.

---

## Riesgos

| Riesgo                                                                                    | Mitigación                                                                                              |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `display: contents` quita el fondo y el borde de `.player-hud` en horizontal              | Las estadísticas y las acciones reciben su propio panel (`--bg-2`, borde `--line`) en la rejilla.       |
| `:has()` no existe en navegadores antiguos                                                | Sin soporte la nav sigue `sticky`, como hoy; el `scrollIntoView` deja igualmente el player arriba.      |
| La barra del navegador móvil cambia `100dvh` al hacer scroll                              | Las fórmulas usan `dvh`; con la barra visible la CRT es algo menor. Pantalla completa sigue disponible. |
| Un teclado físico en tablet y el `scrollIntoView` mueven la página al empezar             | Solo ocurre al tocar el overlay, no al pulsar Espacio.                                                  |
| En pantalla completa (`.av-player:fullscreen`) la rejilla horizontal se comporta distinto | Se verifica `PANTALLA COMPLETA` en 844×390: la CRT y el mando siguen dentro de la pantalla.             |

---

## Lo que **no** entra en esta spec

- Gestos, orientación bloqueada o aviso de girar el dispositivo.
- Textos del HUD o del botón de pantalla completa.
- Tamaño y disposición del mando.
- Reglas, velocidades o puntuación.
- Safe areas de muescas.
- La nav y la base del tema (van en `nav-movil.md` y `base-movil.md`).

Cada una de esas, si llega, va en su propia spec.

> Para implementarla, se mueve a `specs/24-player-movil.md` (siguiente número libre después de `hall-of-fame-movil.md`), pasa a `Aprobado` y se ejecuta `/spec-impl 24-player-movil`.

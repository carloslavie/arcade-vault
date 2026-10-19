# MÓVIL · Base del tema (botones, chips y movimiento reducido)

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-19
> **Objetivo:** Que las clases compartidas del tema (`.btn`, `.chip`, `.lb-link`, etiquetas `--pixel` de 8 px y animaciones) cumplan en pantallas táctiles el mínimo de 44 px, la separación de 8 px y `prefers-reduced-motion`.

---

## Por qué existe esta spec

Las clases de `app/globals.css` se portaron 1:1 desde `references/templates/styles.css`, pensadas para ratón.
Un `.btn` normal mide 41 px de alto y un `.chip` 40 px, y aparecen en casi todas las pantallas.
Arreglarlas una vez en la base evita repetir el mismo ajuste en cada spec de pantalla.

Además, el bloque `@media (prefers-reduced-motion: reduce)` solo cubre `.reveal`, algunos parpadeos y `.touch-btn`.
Con movimiento reducido siguen animándose la rejilla del fondo, los botones `pulse`, las siluetas de la portada y las entradas de filas.

---

## Problemas detectados

| Ruta                                            | Viewport                                   | Evidencia medida                                                                                                                                                                                                                                                      | Causa (selector y archivo)                                                         |
| ----------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `/games`                                        | `movil-v`, `pequeno`, `movil-h`, `tablet`  | Botones `JUGAR` de las tarjetas 100×41                                                                                                                                                                                                                                | `.btn { padding: 12px 20px; font-size: 10px }` sin `min-height`. `app/globals.css` |
| `/login`                                        | `movil-v`, `pequeno`, `movil-h`, `tablet`  | `JUGAR COMO INVITADO` 292×41, `◆ GOOGLE` / `▣ GITHUB` 141×40 (126×40 en 360)                                                                                                                                                                                          | `.btn`, `.social .btn { padding: 12px }`                                           |
| `/games/{asteroids,tetris,arkanoid,snake}/play` | `movil-v`, `pequeno`, `tablet`             | `PAUSA` 100×41, `FIN` 77×41, `PANTALLA COMPLETA` 239×41, `SALIR` 100×41                                                                                                                                                                                               | `.btn` sin `min-height` (el ajuste propio del player va en `player-movil.md`)      |
| `/games`                                        | 4 táctiles                                 | Chips de categoría `TODOS` 80×40, `ARCADE` 90×40, `PUZZLE` 90×40, `SHOOTER` 101×40                                                                                                                                                                                    | `.chip { padding: 12px 14px; font-size: 9px }`                                     |
| `/hall-of-fame`                                 | 4 táctiles                                 | Pestañas de juego 80–121×40, separadas 6 px                                                                                                                                                                                                                           | `.chip` y `.hall-tabs { gap: 6px }`                                                |
| `/`                                             | `movil-v`, `pequeno` / `movil-h`, `tablet` | `VER SALÓN →` 114×41 / 134×28                                                                                                                                                                                                                                         | `.lb-link { padding: 6px 10px }`                                                   |
| `/games`                                        | 4 táctiles                                 | Etiqueta de categoría sobre la portada a 8 px                                                                                                                                                                                                                         | `.card .cover .label { font-size: 8px }`                                           |
| `/`, `/hall-of-fame` y todas las rutas          | `movil-v` con `reducedMotion: 'reduce'`    | `animation-name` sigue activo: `.av-bg::before` `gridscroll`, `.btn.pulse` `pulse`, `.home-silos .silo` `float`, `.hero-scroll .arrow` `bounce`, `.tick-row` `tickin`, `.fade-in` `fadeIn`, `.hall-table .tr` `rise`. `.av-mobile-panel` mantiene `transition: 0.22s` | Falta en el bloque `@media (prefers-reduced-motion: reduce)` de `app/globals.css`  |

---

## Alcance

**Dentro:**

- Bloque `@media (max-width: 1100px)` en `app/globals.css` (mismo corte que la hamburguesa de `nav-movil.md`):
  - `.btn`: `min-height: 44px`.
  - `.chip`: `min-height: 44px`, `display: inline-flex`, `align-items: center`.
  - `.av-chips` y `.hall-tabs`: `gap: 8px`.
  - `.lb-link`: `min-height: 44px`, `display: inline-flex`, `align-items: center`.
  - `.card .cover .label`: `font-size: 10px`.
- Ampliar el bloque `prefers-reduced-motion: reduce`:
  - Sin animación: `.av-bg::before`, `.btn.pulse`, `.home-silos .silo`, `.hero-scroll .arrow`, `.av-hero .sub .blink`, `.live-led span`, `.flicker`, `.spinner`, `.contact-form.shake`.
  - Entradas que parten de `opacity: 0` (`.tick-row`, `.hall-table .tr`, `.fade-in`, `.slide-in`): sin animación y con `opacity: 1` y `transform: none`.
  - `.toast-saved`: sin animación y con `width: 22ch` (si no, el texto se queda en ancho 0).
  - Sin `transition` ni `transform` en hover: `.card`, `.feature-card`, `.mini-card`, `.highlight`, `.av-mobile-panel`, `.av-mobile-backdrop`.
- Diseño con `/frontend-design`, coherente con `references/templates/styles.css`: los botones crecen en alto sin cambiar bordes, `clip-path` ni colores.

**Fuera de alcance (para futuras specs):**

- Cambiar tamaños en escritorio (> 1100 px).
- Botones y textos específicos del player, formularios, nav, landing y Salón de la Fama (van en sus specs de `specs/mobile/`).
- Subir los textos `--pixel` de 9 px: se consideran legibles (~10 px).

---

## Plan de implementación

1. **Objetivos táctiles.** En `app/globals.css`, añadir el bloque `@media (max-width: 1100px)` con `.btn`, `.chip`, `.av-chips`, `.hall-tabs` y `.lb-link`. Comprobar en `movil-v` que `JUGAR` de `/games` mide ≥ 44 px de alto.
2. **Etiqueta de portada.** En el mismo bloque, `.card .cover .label { font-size: 10px }`. Comprobar que no tapa la portada en 360 px.
3. **Movimiento reducido: animaciones infinitas.** Ampliar el bloque `prefers-reduced-motion` con la lista de animaciones decorativas en `animation: none`.
4. **Movimiento reducido: entradas.** Añadir `.tick-row`, `.hall-table .tr`, `.fade-in`, `.slide-in` con `animation: none; opacity: 1; transform: none` y `.toast-saved` con `animation: none; width: 22ch; border-right-color: transparent`.
5. **Movimiento reducido: transiciones.** Añadir `transition: none` a `.av-mobile-panel`, `.av-mobile-backdrop` y a las tarjetas, y `transform: none` en sus `:hover`.

---

## Criterios de aceptación

- [ ] Sin scroll horizontal en `movil-v`, `movil-h`, `pequeno` y `tablet` en `/games`, `/hall-of-fame` y `/login` (con `nav-movil.md` ya aplicada).
- [ ] En los 4 viewports táctiles, todo `.btn` visible mide al menos 44 px de alto.
- [ ] En los 4 viewports táctiles, todo `.chip` mide al menos 44 px de alto y dos chips contiguos están separados al menos 8 px.
- [ ] `VER SALÓN →` en `/` mide al menos 44 px de alto en los 4 viewports táctiles.
- [ ] `.card .cover .label` calcula `font-size: 10px` en 390 px.
- [ ] Con `reducedMotion: 'reduce'`, `getComputedStyle` devuelve `animation-name: none` en `.av-bg::before`, `.btn.pulse`, `.home-silos .silo`, `.hero-scroll .arrow`, `.tick-row`, `.fade-in` y `.hall-table .tr`.
- [ ] Con `reducedMotion: 'reduce'`, las filas de `/hall-of-fame` y del ticker de `/` tienen `opacity: 1` nada más cargar.
- [ ] Con `reducedMotion: 'reduce'`, `.av-mobile-panel` tiene `transition-duration: 0s`.
- [ ] En `desktop` no hay cambios visuales: en 1440×900, `.btn` sigue midiendo 41 px de alto y `.chip` 40 px.
- [ ] La consola no muestra errores en ninguna ruta ni viewport.

---

## Decisiones

- **Sí:** `min-height` en vez de más `padding`. El texto queda centrado igual y el botón no se ensancha.
- **Sí:** corte en 1100 px, el mismo de la hamburguesa. Un solo "modo compacto" para todas las pantallas que no son el player.
- **No:** `@media (pointer: coarse)`. La regla del proyecto es adaptar por ancho fuera del player.
- **No:** subir a 44 px en escritorio. Cambiaría el aspecto 1:1 del prototipo.
- **Sí:** separar chips 8 px en vez de 6 px. Es el mínimo de la auditoría y apenas cambia la fila.
- **Sí:** con movimiento reducido, mostrar directamente el estado final de las entradas. Si solo se quitara la animación, las filas que parten de `opacity: 0` serían invisibles.
- **No:** quitar el parpadeo de `TOCA PARA EMPEZAR` aquí. `.crt-overlay .prompt` ya está cubierto en el bloque actual.

---

## Riesgos

| Riesgo                                                                | Mitigación                                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Algún `.btn` dentro de un contenedor de alto fijo se sale con 44 px   | Se recorren las 7 rutas en los 4 viewports táctiles con la medición de desborde.                 |
| El player en horizontal ya ajusta `.hud-actions .btn` y crece en alto | `player-movil.md` rediseña ese HUD contando con botones de 44 px; se implementa después de esta. |
| Ventanas de escritorio ≤ 1100 px ven botones 3 px más altos           | Cambio mínimo y coherente con la hamburguesa del mismo ancho.                                    |

---

## Lo que **no** entra en esta spec

- Cambios en escritorio > 1100 px.
- Ajustes propios de la nav, el player, los formularios, la portada y el Salón de la Fama.
- Textos `--pixel` de 9 px.

Cada una de esas, si llega, va en su propia spec.

> Para implementarla, se mueve a `specs/20-base-movil.md` (siguiente número libre después de `nav-movil.md`), pasa a `Aprobado` y se ejecuta `/spec-impl 20-base-movil`.

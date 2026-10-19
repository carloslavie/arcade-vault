# MÓVIL · Salón de la Fama

> **Estado:** Borrador
> **Depende de:** SPEC 09
> **Fecha:** 2026-10-19
> **Objetivo:** Que en `/hall-of-fame` la tabla muestre rango, jugador y puntuación sin salirse del ancho en 360 px y que el podio apilado empiece por el campeón.

---

## Por qué existe esta spec

`components/hall-of-fame.tsx` pinta la tabla con 4 columnas de rejilla.
En móvil (`max-width: 720px`) pasan a `50px 1fr 90px 90px`, pero los encabezados `PUNTUACIÓN` y `FECHA` en `--pixel` no caben en 90 px.
A 360 px la tabla desborda su contenedor y `body` (`overflow-x: hidden`) recorta la columna de fecha.

El podio pasa a una columna por debajo de 720 px, pero conserva el orden del DOM (plata, oro, bronce).
En móvil el primer puesto aparece **debajo** del segundo.

---

## Problemas detectados

| Ruta                        | Viewport             | Evidencia medida                                                                                                                 | Causa (selector y archivo)                                                                                                   |
| --------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/hall-of-fame?game=tetris` | `pequeno` (360)      | `.hall-table` en x 16–344, pero el encabezado `FECHA` está en x 296–386 (42 px fuera). Columnas calculadas `50px 97px 90px 90px` | `.hall-table .th, .tr { grid-template-columns: 50px 1fr 90px 90px }` + `gap: 10px` + `padding: 10px 12px`. `app/globals.css` |
| `/hall-of-fame`             | `movil-v`, `pequeno` | Podio apilado: `.podium-slot.silver` top 357, `.podium-slot.gold` top 530, `.podium-slot.bronze` top 735                         | `.podium { grid-template-columns: 1fr }` por debajo de 720 px con el orden del DOM 2-1-3                                     |
| `/hall-of-fame`             | 4 táctiles           | Etiqueta `< TÚ` de tu fila a 8 px                                                                                                | `.hall-table .tr.you[aria-current] .pl::after { font-size: 8px }`                                                            |

Sin problemas: en `movil-v` (390) y `tablet` la tabla cabe. En los 5 viewports el subtítulo y el botón `VOLVER A LA BIBLIOTECA` se ven enteros.
Las pestañas de juego (`.chip` de 40 px separadas 6 px) y la animación `rise` con movimiento reducido van en `base-movil.md`.

---

## Alcance

**Dentro:**

- Tabla en `@media (max-width: 520px)`:
  - Filas `.tr` con 3 columnas `44px minmax(0, 1fr) auto` y `grid-template-areas` `"rk pl sc"` / `"rk dt sc"`.
  - La fecha (`.dt`) pasa debajo del nombre, en `--mono` 11 px y `--ink-faint`, como en `.lb-row` del detalle de juego.
  - El encabezado `.th` usa las mismas 3 columnas en una sola fila y oculta su 4.ª celda (`FECHA`).
  - `.pl` con `overflow: hidden` y `text-overflow: ellipsis`.
  - Las filas de estado (`.tr.status`, `.tr.you-label`) mantienen su `grid-template-columns: 1fr` sin áreas.
- Podio en `@media (max-width: 720px)`: `.podium-slot.gold { order: -1 }`, para que el orden visual sea 1-2-3.
- `< TÚ` a 10 px por debajo de 720 px.
- Diseño con `/frontend-design`, coherente con `references/templates/styles.css` (mismas medallas y colores).

**Fuera de alcance (para futuras specs):**

- Cambiar los datos, el top 20 o la fila "tu mejor marca".
- Convertir la tabla en tarjetas.
- Scroll horizontal interno de la tabla.

---

## Plan de implementación

1. **Áreas de la tabla.** En `app/globals.css`, `@media (max-width: 520px)`: `grid-template-columns` y `grid-template-areas` para `.hall-table .tr`, y `grid-area` para `.rk`, `.pl`, `.sc`, `.dt`. Comprobar en 360 px que ninguna celda pasa de x 344.
2. **Encabezado.** `.hall-table .th` con `grid-template-columns: 44px minmax(0, 1fr) auto` y `.hall-table .th > :nth-child(4) { display: none }` en el mismo bloque.
3. **Estados.** `grid-template-areas: none` en `.tr.status` y `.tr.you-label`. Comprobar que `.tr.status`, `.tr.status.you-none` y `.tr.you-label` siguen en una sola columna.
4. **Podio.** `.podium-slot.gold { order: -1 }` dentro del `@media (max-width: 720px)` del podio. Comprobar en 390 px que `.gold` es el primero.
5. **Etiqueta TÚ.** `font-size: 10px` para `.hall-table .tr.you[aria-current] .pl::after` en `@media (max-width: 720px)`.

---

## Criterios de aceptación

- [ ] Sin scroll horizontal en `movil-v`, `movil-h`, `pequeno` y `tablet` en `/hall-of-fame` y en `/hall-of-fame?game=` con `asteroids`, `tetris`, `arkanoid` y `snake` (con `nav-movil.md` ya aplicada).
- [ ] En 360 px, ningún hijo de `.hall-table` tiene `getBoundingClientRect().right` mayor que el `right` de `.hall-table`.
- [ ] En 360 px, cada fila de puntuación muestra rango, jugador y puntuación en la misma línea y la fecha debajo del jugador.
- [ ] En 360 px, `.th` muestra `RANGO`, `JUGADOR` y `PUNTUACIÓN` en una fila y no muestra `FECHA`.
- [ ] En 390 px, `.podium-slot.gold` tiene un `top` menor que `.podium-slot.silver` y `.podium-slot.bronze`.
- [ ] Los estados `AÚN NO HAY PUNTUACIONES` y `ERROR AL CARGAR EL RANKING.` ocupan todo el ancho de la tabla en 360 px.
- [ ] En `desktop` no hay cambios visuales: en 1440×900 la tabla tiene 4 columnas con `FECHA` y el podio sigue en orden 2-1-3.
- [ ] La consola no muestra errores en ninguna ruta ni viewport.

---

## Decisiones

- **Sí:** fecha debajo del nombre por debajo de 520 px. Rango, jugador y puntuación son lo importante; la fecha sigue visible.
- **No:** scroll horizontal dentro de la tabla. Esconde la puntuación, que es justo la columna clave.
- **No:** tabla en tarjetas. Es un rediseño mayor y la fila de 3 columnas ya cabe.
- **Sí:** CSS puro (`grid-template-areas`), sin tocar `components/hall-of-fame.tsx`. El marcado actual ya tiene las 4 celdas con clase propia.
- **Sí:** reordenar el podio con `order` solo en móvil. En escritorio el 2-1-3 tiene sentido porque el oro queda en el centro y más alto; apilado, el orden de lectura debe ser 1-2-3.

---

## Riesgos

| Riesgo                                                            | Mitigación                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Una puntuación de 7 cifras (`1.234.567`) empuja la columna `auto` | Se prueba con ese valor en 360 px; `.pl` con `minmax(0, 1fr)` cede el espacio. |
| La fila `.tr.you` con `padding-left: 15px` y borde descuadra      | Se comprueba la fila resaltada en 360 px con sesión.                           |

---

## Lo que **no** entra en esta spec

- Datos o lógica del Salón de la Fama.
- Tarjetas o scroll interno en la tabla.
- Pestañas `.chip` y animaciones (van en `base-movil.md`).

Cada una de esas, si llega, va en su propia spec.

> Para implementarla, se mueve a `specs/23-hall-of-fame-movil.md` (siguiente número libre después de `landing-movil.md`), pasa a `Aprobado` y se ejecuta `/spec-impl 23-hall-of-fame-movil`.

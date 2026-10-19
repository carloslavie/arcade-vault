# MÓVIL · Landing

> **Estado:** Borrador
> **Depende de:** SPEC 02
> **Fecha:** 2026-10-19
> **Objetivo:** Que la portada `/` no tenga contenido que se salga del ancho en 360 px ni en tablet, con márgenes laterales de móvil y un hero que use la altura real de la pantalla.

---

## Por qué existe esta spec

`components/landing.tsx` usa `.home-section` con `padding: 0 32px` en todos los anchos.
A 360 px solo quedan 296 px de contenido, y dos rejillas de la portada no pueden encogerse por debajo del ancho mínimo de su contenido.
En tablet, la palabra `GLOBAL` de las estadísticas no cabe en su columna.
Como `body` tiene `overflow-x: hidden`, el contenido no genera scroll: queda **recortado** en el borde derecho.

---

## Problemas detectados

| Ruta | Viewport             | Evidencia medida                                                                                                                                                                | Causa (selector y archivo)                                                                                               |
| ---- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/`  | `pequeno` (360)      | `.activity-card` de `ÚLTIMAS PUNTUACIONES` en x 32–372 (12 px fuera). La columna de `.activity-grid` calcula 339,8 px en un contenedor de 296 px                                | `.activity-grid { grid-template-columns: 1fr }` (mínimo `auto`) + `.home-section { padding: 0 32px }`. `app/globals.css` |
| `/`  | `tablet` (768)       | `.stat-block` de `GLOBAL` en x 497–777 (9 px fuera). `.stat-n` `GLOBAL` mide 240 px en una columna de ~213 px                                                                   | `.stats-inner { grid-template-columns: repeat(3, 1fr) }` hasta 720 px y `.stat-n { font-size: clamp(32px, 5vw, 56px) }`  |
| `/`  | 4 táctiles           | `.home-section` mantiene 32 px de margen lateral en 360 y 390 px (las demás pantallas bajan a 16 px)                                                                            | Falta `.home-section` en `@media (max-width: 720px)`                                                                     |
| `/`  | `movil-v`, `pequeno` | `.home-hero { min-height: calc(100vh - 60px) }`. En móvil `100vh` es la altura con la barra del navegador oculta, así que el hero es más alto que la pantalla visible al cargar | `app/globals.css`. Además la nav mide 66–81 px, no 60                                                                    |

Sin problemas: `.feature-grid`, `.mini-rail`, `.pricing-grid` y `.pc-stamp` caben en los 5 viewports.
El objetivo táctil `VER SALÓN →` y las animaciones con movimiento reducido van en `base-movil.md`.

---

## Alcance

**Dentro:**

- `@media (max-width: 720px)`: `.home-section { padding: 0 16px }`, igual que `.av-grid` y `.av-hall`.
- `.activity-grid { grid-template-columns: minmax(0, 1fr) }` en su media query de 900 px, para que la columna pueda encoger.
- Estadísticas en tablet: en `@media (max-width: 900px)`, `.stats-inner { grid-template-columns: repeat(3, minmax(0, 1fr)) }` y `.stat-n { font-size: clamp(24px, 4vw, 56px) }`. Por debajo de 720 px sigue la columna única actual.
- `.home-hero { min-height: calc(100svh - 66px) }`.
- Diseño con `/frontend-design`, coherente con `references/templates/styles.css`.

**Fuera de alcance (para futuras specs):**

- Contenido, textos o datos de la portada (`lib/home.ts`).
- Orden o número de secciones.
- Animaciones (van en `base-movil.md`).

---

## Plan de implementación

1. **Márgenes laterales.** Añadir `.home-section { padding: 0 16px }` al bloque `@media (max-width: 720px)` de `app/globals.css`. Comprobar en 360 px que `.activity-grid` empieza en x 16.
2. **Columna de actividad.** Cambiar `.activity-grid` a `minmax(0, 1fr)` en `@media (max-width: 900px)`. Comprobar en 360 px que ningún `.tick-row` pasa de x 344.
3. **Estadísticas.** Añadir el bloque de 900 px para `.stats-inner` y `.stat-n`. Comprobar en 768 px que `.stat-block` de `GLOBAL` termina antes de x 736.
4. **Hero.** Cambiar `min-height` de `.home-hero` a `calc(100svh - 66px)`. Comprobar en 390×844 que los dos CTA del hero se ven sin hacer scroll.

---

## Criterios de aceptación

- [ ] Sin scroll horizontal en `movil-v`, `movil-h`, `pequeno` y `tablet` en `/` (con `nav-movil.md` ya aplicada).
- [ ] En 360 px, ningún elemento de `main` tiene `getBoundingClientRect().right` mayor que 360.
- [ ] En 768 px, ningún `.stat-block` tiene `right` mayor que 768 y el texto `GLOBAL` se ve entero.
- [ ] En 360 y 390 px, `.home-section` tiene 16 px de `padding` lateral.
- [ ] En 390×844, `▶ EXPLORAR JUEGOS` y `✦ CREAR CUENTA` están dentro de la altura visible al cargar.
- [ ] En `desktop` no hay cambios visuales: en 1440×900 las estadísticas siguen en 3 columnas con `.stat-n` de 56 px y `.home-section` con 32 px de margen.
- [ ] La consola no muestra errores en ninguna ruta ni viewport.

---

## Decisiones

- **Sí:** `minmax(0, 1fr)` en vez de esconder columnas. El contenido es el mismo y el ticker ya pasa a dos filas por debajo de 520 px.
- **Sí:** reducir `.stat-n` en tablet en vez de pasar a una columna. Las 3 cifras en fila siguen siendo el diseño del prototipo.
- **Sí:** `100svh` y no `100dvh` en el hero. `svh` no cambia al ocultarse la barra del navegador, así el hero no salta al hacer scroll.
- **No:** reducir el `margin: 80px auto` entre secciones. Es ritmo visual, no un problema de adaptación.

---

## Riesgos

| Riesgo                                                              | Mitigación                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `svh` no existe en navegadores antiguos                             | Se deja antes `min-height: calc(100vh - 66px)` como respaldo.          |
| `clamp(24px, 4vw, 56px)` cambia `.stat-n` en ventanas de 720–900 px | Solo aplica por debajo de 900 px; en escritorio sigue la regla actual. |

---

## Lo que **no** entra en esta spec

- Cambios de contenido o de orden de la portada.
- Animaciones y objetivos táctiles compartidos (van en `base-movil.md`).
- La nav (va en `nav-movil.md`).

Cada una de esas, si llega, va en su propia spec.

> Para implementarla, se mueve a `specs/22-landing-movil.md` (siguiente número libre después de `formularios-movil.md`), pasa a `Aprobado` y se ejecuta `/spec-impl 22-landing-movil`.

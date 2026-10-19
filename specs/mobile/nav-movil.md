# MÓVIL · Navegación

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 04
> **Fecha:** 2026-10-19
> **Objetivo:** Que la cabecera `.av-nav` y su menú lateral quepan sin scroll horizontal en cualquier ancho, con objetivos táctiles de 44 px y el menú hamburguesa en móvil horizontal y tablet.

---

## Por qué existe esta spec

`.av-nav` está en todas las rutas, así que su desborde estira **todas** las páginas.
SPEC 18 ya lo detectó en 844×390 y lo dejó fuera de alcance.
La auditoría muestra que también pasa en vertical: a 390 y 360 px el botón hamburguesa termina en x=396.
Chrome móvil reacciona ampliando el layout viewport a 396 px (o 1146 px en horizontal) y reduce el zoom de toda la página.
El resultado es una web que se ve más pequeña y se puede arrastrar de lado en cualquier pantalla.

La regla actual cambia a hamburguesa en `max-width: 840px`, igual que `references/templates/styles.css`.
Pero el contenido completo de la nav (logo, 4 enlaces, `CRÉDITOS · 03`, botón de sesión) mide unos 1146 px.
Cualquier ventana entre 841 y 1180 px desborda, incluida una tablet en horizontal (1024 px).

Método de medida: Playwright con contexto `hasTouch: true`, `isMobile: true`. Se compara `getBoundingClientRect().right` con el ancho configurado, porque con `isMobile` el navegador agranda `innerWidth` para que quepa el desborde.

---

## Problemas detectados

| Ruta  | Viewport                       | Evidencia medida                                                                                                                                                    | Causa (selector y archivo)                                                                                              |
| ----- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Todas | `movil-v` (390)                | `scrollWidth` 396. `.hamburger` en x 346–396. `.auth-btn` 123×56 (el texto "Iniciar Sesión" parte en 2 líneas)                                                      | `.av-nav` con `gap: 24px` + `.auth-btn` (`margin-left: 16px`) + `.hamburger` no caben en 390 − 32 px. `app/globals.css` |
| Todas | `pequeno` (360)                | `scrollWidth` 396: 36 px de desborde. Mismo recorte del botón hamburguesa                                                                                           | Igual que arriba. `components/nav.tsx` muestra `.auth-btn` en todos los anchos                                          |
| Todas | `movil-h` (844)                | `scrollWidth` 1146. Desbordan `.coin-counter` (right 982) y `.auth-btn` (right 1146). Nav de 85 px de alto                                                          | `@media (max-width: 840px)` no aplica a 844 px: se ven `.links` (287–839), contador y botón                             |
| Todas | escritorio 1024×768            | `scrollWidth` 1146 (medido sin emulación)                                                                                                                           | Mismo breakpoint de 840 px. No es uno de los 5 viewports, pero es una tablet en horizontal                              |
| Todas | `movil-v`, `pequeno`, `tablet` | `.hamburger` 50×41. `.logo` 119×36 (390) y 199×28 (768)                                                                                                             | `.btn` sin `min-height`. `.av-nav .logo` sin alto mínimo                                                                |
| Todas | `movil-h`                      | Enlaces `.links a` de 34 px de alto separados 4 px                                                                                                                  | `.av-nav .links { gap: 4px }`, `padding: 10px 14px`. Desaparecen al pasar a hamburguesa en este ancho                   |
| Todas | `movil-v`                      | Menú abierto: enlaces 279×46 (ok). `.hamburger` sin `aria-expanded`. Panel cerrado sin `inert` (sus enlaces siguen en el orden de tabulación fuera de pantalla)     | `components/nav.tsx`                                                                                                    |
| Todas | táctiles con sesión            | Con sesión, el panel enlaza "Cuenta" a `/login`, que redirige a `/games`. Si el botón de sesión deja de verse en la barra, no queda forma de cerrar sesión en móvil | `components/nav.tsx`: el panel no tiene la acción `logout`                                                              |

---

## Alcance

**Dentro:**

- Breakpoints de la nav en `app/globals.css`:
  - `max-width: 1100px`: modo hamburguesa (se ocultan `.links` y `.coin-counter`, se ve `.hamburger`). Cubre `movil-h`, `tablet` y tablets en horizontal.
  - `1101px` a `1199px`: barra completa sin `.coin-counter`.
  - `≥ 1200px`: sin cambios.
- En modo hamburguesa: `padding: 12px 16px`, `gap: 12px`.
- `max-width: 480px`: `.auth-btn` se oculta de la barra. La acción de sesión pasa al panel.
- Objetivos táctiles: `.hamburger` y `.logo` con `min-height: 44px` (y `.hamburger` con `min-width: 44px`). El glifo `≡` crece a 16 px para leerse.
- Panel móvil (`components/nav.tsx`):
  - Sin sesión: el enlace `Iniciar Sesión` se queda como está.
  - Con sesión: el enlace "Cuenta" se sustituye por un botón `CERRAR SESIÓN · {nombre}` que llama a `logout` y cierra el panel.
  - `.hamburger` con `aria-expanded` y `aria-controls` apuntando al `id` del panel.
  - `.av-mobile-panel` con `inert` mientras está cerrado.
- Diseño visual con `/frontend-design`, coherente con `references/templates/styles.css` (mismos colores, `--pixel`, bordes `--line`).

**Fuera de alcance (para futuras specs):**

- Rediseñar la nav de escritorio o sus textos.
- Cerrar el panel con Escape, trampa de foco o swipe para cerrar.
- Mostrar el contador de créditos en móvil (ya aparece en el pie del panel).
- `env(safe-area-inset-*)` para muescas.

---

## Plan de implementación

1. **Breakpoint de hamburguesa.** En `app/globals.css`, cambiar `@media (max-width: 840px)` del bloque `.av-nav` a `@media (max-width: 1100px)` y añadir `gap: 12px`. Comprobar en 844×390 y 1024×768 que `scrollWidth` es igual al ancho.
2. **Banda intermedia.** Añadir `@media (min-width: 1101px) and (max-width: 1199px) { .av-nav .coin-counter { display: none } }`. Comprobar en 1180×800 que no hay desborde.
3. **Botón de sesión en pantallas estrechas.** Añadir `@media (max-width: 480px) { .av-nav .auth-btn { display: none } }`. Comprobar en 390 y 360 que `.hamburger` termina a ≤ 16 px del borde derecho.
4. **Objetivos táctiles.** `.av-nav .hamburger { min-width: 44px; min-height: 44px; font-size: 16px }` y `.av-nav .logo { min-height: 44px }`, dentro del bloque de 1100 px.
5. **Acción de sesión en el panel.** En `components/nav.tsx`, con `user` renderizar en `.av-mobile-panel` un `<button>` `CERRAR SESIÓN · {user.name}` que llama a `logout` y a `close`. Estilo en `globals.css` igual que `.av-mobile-panel a`, con color `--magenta`.
6. **Accesibilidad del panel.** En `components/nav.tsx`: `id="av-mobile-panel"` en el `<aside>`, `aria-controls` y `aria-expanded={open}` en `.hamburger`, e `inert={!open}` en el `<aside>`.

---

## Criterios de aceptación

- [ ] Sin scroll horizontal en `movil-v`, `movil-h`, `pequeno` y `tablet`: en todas las rutas, `document.documentElement.scrollWidth` es igual al ancho del viewport.
- [ ] Ningún elemento de `.av-nav` tiene `getBoundingClientRect().right` mayor que el ancho del viewport en 360, 390, 768, 844, 1024 y 1180 px.
- [ ] En 844×390 y 768×1024 se ve `.hamburger` y no se ven `.links` ni `.coin-counter`.
- [ ] En 844×390, `.av-nav` mide como máximo 68 px de alto.
- [ ] En 390 y 360 px no se ve `.auth-btn` en la barra, y el panel muestra `Iniciar Sesión` (sin sesión).
- [ ] Con sesión, el panel muestra `CERRAR SESIÓN · {nombre}` y al pulsarlo se cierra la sesión.
- [ ] `.hamburger` mide al menos 44×44 px y `.logo` al menos 44 px de alto en los 4 viewports táctiles.
- [ ] `.hamburger` tiene `aria-expanded="false"` cerrado y `"true"` abierto.
- [ ] Con el panel cerrado, Tab no enfoca ningún enlace del panel.
- [ ] En `desktop` no hay cambios visuales: la nav de 1440×900 se ve igual que antes (enlaces, contador y botón de sesión).
- [ ] La consola no muestra errores en ninguna ruta ni viewport.

---

## Decisiones

- **Sí:** subir el breakpoint de hamburguesa a 1100 px. El contenido completo mide ~1146 px; con 840 px desbordaba todo lo que hay entre medias.
- **No:** encoger enlaces y fuentes para que la barra completa quepa en 844 px. Quedarían textos `--pixel` por debajo de 9 px y objetivos de 34 px.
- **Sí:** banda 1101–1199 px sin contador de créditos. Es decorativo y sigue en el panel.
- **Sí:** ocultar el botón de sesión por debajo de 480 px y mover la acción al panel. Con "Iniciar Sesión" partido en dos líneas o un nombre de 10 caracteres no cabe junto al logo y la hamburguesa.
- **Sí:** botón CERRAR SESIÓN en el panel. Sin él, un usuario con sesión en móvil no podría salir; no es una función nueva, es la misma acción de la barra.
- **No:** menú desplegable o barra inferior de pestañas. El prototipo ya define el panel lateral y se mantiene.
- **Sí:** media queries de ancho y no `(pointer: coarse)`. Es la regla del proyecto para todo lo que no es el player.

---

## Riesgos

| Riesgo                                                       | Mitigación                                                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Un portátil de 1024–1100 px con ratón ve la hamburguesa      | Es aceptable: antes tenía scroll horizontal. El panel funciona igual con ratón.           |
| Un nombre de usuario largo desborda en la banda 1101–1199 px | El nombre tiene máx. 10 caracteres (`AUTH_LIMITS`); se verifica con uno de 10 en 1101 px. |
| `inert` no existe en navegadores muy antiguos                | Es progresivo: sin soporte, el comportamiento es el de hoy.                               |

---

## Lo que **no** entra en esta spec

- Rediseño de la nav de escritorio.
- Escape, trampa de foco o gestos en el panel.
- Safe areas de muescas.
- Tamaños de botones fuera de la nav (van en `base-movil.md`).

Cada una de esas, si llega, va en su propia spec.

> Para implementarla, se mueve a `specs/19-nav-movil.md` (siguiente número libre; si ya está ocupado, el siguiente), pasa a `Aprobado` y se ejecuta `/spec-impl 19-nav-movil`.

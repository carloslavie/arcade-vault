# SPEC 02 — Landing en `/` y Biblioteca en `/games`

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-09-28
> **Objetivo:** Mover la Biblioteca de `/` a `/games` y portar 1:1 en `/` la landing de `references/templates/home-about/`, sin la página "Acerca de".

---

## Por qué existe esta spec

En SPEC 01 la Biblioteca ocupa la home.
La nueva referencia (`references/templates/home-about/home.jsx`, `nav.jsx`, `styles.css`) añade una landing de presentación como pantalla de entrada y un Nav con "Inicio" y "Acerca de".
Cambiar la ruta de la Biblioteca obliga a revisar todos los enlaces y redirecciones que hoy apuntan a `/`.

---

## Alcance

**Dentro:**

- Mover la Biblioteca (hero `.av-hero` + `Library`) de `app/page.tsx` a `app/games/page.tsx`, sin cambios visuales.
- Landing en `/` portada 1:1 desde `home.jsx`, con estas secciones en este orden:
  - **Hero:** siluetas pixel flotantes (8 SVG), eyebrow "▸ INSERTA UNA MONEDA_", título en tres líneas, subtítulo, botones "▶ EXPLORAR JUEGOS" y "✦ CREAR CUENTA", indicador "DESLIZA ▼".
  - **// 01 ¿POR QUÉ ARCADE VAULT?:** 4 feature cards con icono pixel (GAMEPAD, FREE, TROPHY, ROCKET).
  - **// 02 JUEGOS DISPONIBLES AHORA:** mini-rail con los 6 primeros juegos de `GAMES` y botón "VER TODOS LOS JUEGOS →".
  - **Stats:** "12+ JUEGOS", "MILES DE PARTIDAS", "GLOBAL RANKING".
  - **// 03 ACTIVIDAD EN VIVO:** ticker de 7 últimas puntuaciones y top 5 jugadores de hoy con botón "VER SALÓN →".
  - **// 04 PRECIOS:** tarjeta "JUGADOR VAULT" ($0 / SIEMPRE, 6 ventajas, sello FREE PLAY) y 3 preguntas FAQ.
  - **CTA final:** "¿LISTO PARA JUGAR?" con botón "INSERTAR MONEDA →".
- Animación `.reveal` al hacer scroll con `IntersectionObserver`, igual que la referencia.
- Con `prefers-reduced-motion: reduce`, las secciones `.reveal` se muestran directamente sin animación.
- Destinos de la landing:
  - "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" → `/games`.
  - "CREAR CUENTA" y "EMPEZAR GRATIS →" → `/login?mode=register`.
  - Cada mini-card → `/games/[id]`.
  - "VER SALÓN →" → `/hall-of-fame`.
- `/login?mode=register` abre `AuthForm` con la tab CREAR CUENTA activa. Sin el parámetro (o con otro valor) abre INICIAR SESIÓN como ahora.
- Nav (desktop y panel móvil) con los links Inicio · Biblioteca · Salón de la Fama · Acerca de, en ese orden.
  - Inicio → `/`, activo solo en `/`.
  - Biblioteca → `/games`, activo en `/games`, `/games/[id]` y `/games/[id]/play`.
  - Salón de la Fama → `/hall-of-fame`, sin cambios.
  - Acerca de: `<span aria-disabled="true">` atenuado, con `cursor: not-allowed`, sin navegación y sin texto extra.
  - El logo sigue llevando a `/`.
- Enlaces existentes que significan "Biblioteca" pasan a `/games`:
  - "VOLVER AL VAULT" del Detalle (`app/games/[id]/page.tsx`).
  - "VOLVER AL VAULT" del modal del Reproductor (`components/game-player.tsx`).
  - "VOLVER A LA BIBLIOTECA" del Salón (`components/hall-of-fame.tsx`).
  - Redirect tras enviar el login y tras "JUGAR COMO INVITADO" (`components/auth-form.tsx`).
- Portar a `app/globals.css` solo el CSS de la landing: bloques `HOME PAGE`, `ACTIVITY (leaderboard + ticker)` y `PRICING` de `references/templates/home-about/styles.css`, más la regla del link deshabilitado y la de movimiento reducido.

**Fuera de alcance (para futuras specs):**

- Página "Acerca de" (`about.jsx`) y su ruta.
- CSS de `ABOUT PAGE`, `GAMEPAD` y `Theme variants` de la nueva `styles.css`.
- Datos reales en la landing: el ticker, el top 5 y los stats son texto fijo.
- Corregir "12+ JUEGOS" para que coincida con `GAMES.length`.
- Redirección de `/` a `/games` para enlaces antiguos (no hay usuarios aún).
- Cualquier cambio visual en Biblioteca, Detalle, Reproductor, Acceso o Salón aparte de los destinos de sus enlaces.
- Framework de tests.

---

## Modelo de datos

Esta feature no introduce estructuras persistentes nuevas. Reutiliza `GAMES` y `Game` de `lib/games.ts` (SPEC 01).

Los textos mock de la landing viven en `lib/home.ts`, copiados 1:1 de `home.jsx`:

```ts
import type { NeonColor } from "@/lib/games";

export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export interface Feature { icon: FeatureIconKind; title: string; desc: string; color: NeonColor }
export interface Stat { n: string; u: string; s: string }
export interface TickerRow { player: string; game: string; score: number; ago: string; color: NeonColor }
export interface TopPlayer { rank: number; player: string; score: number }
export interface Faq { q: string; a: string }

export const FEATURES: Feature[];       // 4 entradas
export const STATS: Stat[];             // 3 entradas
export const TICKER: TickerRow[];       // 7 entradas
export const TOP_PLAYERS: TopPlayer[];  // 5 entradas
export const PRICING_PERKS: string[];   // 6 entradas, sin el "✔ " inicial
export const FAQS: Faq[];               // 3 entradas
```

Contrato nuevo de `AuthForm`:

```ts
type AuthTab = "in" | "up";
export function AuthForm(props: { initialTab?: AuthTab }): JSX.Element; // por defecto "in"
```

Convenciones:

- Números con `toLocaleString("es-ES")`, como en SPEC 01.
- El ancho de la barra del top 5 es `100 - i * 16` %, igual que la referencia.
- `mode=register` es el único valor que activa `initialTab="up"`.

---

## Plan de implementación

1. **Mover la Biblioteca.** Crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` y `metadata.title = "Biblioteca"`. Dejar `app/page.tsx` temporalmente con el mismo contenido. Verificar: `/games` muestra la Biblioteca con búsqueda y chips funcionando.
2. **Enlaces a `/games`.** Cambiar a `/games` los destinos de "VOLVER AL VAULT" (Detalle y Reproductor), "VOLVER A LA BIBLIOTECA" (Salón) y los dos `router.push` de `components/auth-form.tsx`. Verificar cada botón a mano.
3. **Nav.** En `components/nav.tsx`: añadir Inicio (`/`), mover Biblioteca a `/games`, añadir "Acerca de" como `<span aria-disabled="true" className="disabled">` en `.links` y en `.av-mobile-panel`. Nueva lógica de activo: Inicio si `pathname === "/"`; Biblioteca si `pathname === "/games"` o empieza por `/games/`. Añadir en `globals.css` la regla del link deshabilitado (opacidad baja, `cursor: not-allowed`, sin hover). Verificar a 1280 px y a 390 px.
4. **Tab inicial de Acceso.** `AuthForm` acepta `initialTab` y lo usa como valor inicial de `useState`. `app/login/page.tsx` lee `searchParams` (es una `Promise` en Next 16: consultar `node_modules/next/dist/docs/` antes) y pasa `initialTab="up"` si `mode === "register"`. Verificar `/login` y `/login?mode=register`.
5. **CSS de la landing.** Copiar a `app/globals.css`, dentro de `@layer components`, los bloques `HOME PAGE`, `ACTIVITY (leaderboard + ticker)` y `PRICING` de `references/templates/home-about/styles.css`. Añadir `@media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } }`. `npm run build` pasa.
6. **Datos mock.** Crear `lib/home.ts` con los tipos y constantes del modelo de datos.
7. **Iconos pixel.** Crear `components/pixel-art.tsx` (Server) con `FloatingSilhouettes` (8 SVG de la referencia) y `FeatureIcon({ kind })`, convirtiendo atributos SVG a JSX (`strokeWidth`...).
8. **Reveal.** Crear `components/reveal-observer.tsx` (Client) que en un `useEffect` observa `.reveal` con `IntersectionObserver` (`threshold: 0.12`), añade `in` y hace `unobserve`. Devuelve `null`. Limpia con `disconnect()`.
9. **Landing.** Crear `components/landing.tsx` (Server) con las 7 secciones usando el markup y las clases de `home.jsx`. Botones como `<Link>` con las clases `btn` de la referencia. `MiniCard` y "VER SALÓN →" (`.lb-link`) como `<Link>`. Reemplazar `app/page.tsx` por `<Landing />` + `<RevealObserver />`, sin `metadata.title` propio (usa el `default` del layout). Se usa `/frontend-design` solo para huecos que la plantilla no define.
10. **Cierre.** Confirmar que `npm run lint` y `npm run build` pasan y que `/` y `/games` son estáticas en la salida del build.

---

## Criterios de aceptación

- [x] `npm run build` termina sin errores ni warnings de tipos.
- [x] `npm run lint` termina sin errores.
- [x] La consola del navegador no muestra errores de hidratación en `/`, `/games` y `/login?mode=register`.
- [x] `/` muestra, en orden: hero, // 01, // 02, stats, // 03, // 04 y CTA final.
- [x] El hero muestra las 8 siluetas flotando y el indicador "DESLIZA ▼".
- [x] La mini-rail muestra exactamente los 6 primeros juegos de `GAMES`.
- [x] Hacer clic en una mini-card abre `/games/<id>` de ese juego.
- [x] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" llevan a `/games`.
- [x] "CREAR CUENTA" y "EMPEZAR GRATIS →" abren `/login` con la tab CREAR CUENTA activa y el campo de correo visible.
- [x] `/login` sin parámetros abre con INICIAR SESIÓN activa.
- [x] "VER SALÓN →" lleva a `/hall-of-fame`.
- [x] Las secciones con `.reveal` aparecen con fundido al entrar en pantalla y quedan visibles al volver a subir.
- [x] Con `prefers-reduced-motion: reduce` emulado, todas las secciones son visibles sin hacer scroll ni animación.
- [x] `/games` muestra la Biblioteca con los 8 juegos, la búsqueda y los chips igual que antes en `/`.
- [x] El Nav muestra Inicio · Biblioteca · Salón de la Fama · Acerca de, en desktop y en el panel móvil.
- [x] Inicio está activo solo en `/`. Biblioteca está activa en `/games`, `/games/caida` y `/games/caida/play`.
- [x] "Acerca de" se ve atenuado, muestra cursor `not-allowed` y al hacer clic la URL no cambia.
- [x] "VOLVER AL VAULT" del Detalle y del modal del Reproductor llevan a `/games`.
- [x] "VOLVER A LA BIBLIOTECA" del Salón lleva a `/games`.
- [x] Enviar el login y pulsar "JUGAR COMO INVITADO" redirigen a `/games`.
- [x] Ningún `<Link>` de la landing muestra subrayado ni color de enlace por defecto.
- [x] A 390 px de ancho, `/` no tiene scroll horizontal y feature-grid, mini-rail, stats, actividad y precios se apilan según los media queries de la referencia.

---

## Decisiones

- **Sí:** la Biblioteca en `/games`. Decisión del usuario; `/` pasa a ser la landing.
- **Sí:** port 1:1 del markup, textos y clases de `home.jsx`. Mismo criterio que SPEC 01.
- **Sí:** "Acerca de" visible pero deshabilitado (`<span aria-disabled>`, solo atenuado). Decisión del usuario.
- **No:** omitir el link ni enlazar a `/about` con 404. El usuario prefiere que se vea pero sin link roto.
- **No:** etiqueta "PRONTO" junto a "Acerca de". El usuario eligió solo atenuado.
- **Sí:** `white-space: nowrap` en `.av-nav .logo-text` y en los links del Nav. Con 4 links, a 1280 px "Salón de la Fama", "Acerca de" y el logo se partían en dos líneas (también en la referencia). Decisión del usuario durante la implementación. Por debajo de 840 px el logo vuelve a `white-space: normal`: con `nowrap` empujaba la hamburguesa fuera de la pantalla.
- **No:** subir el corte del menú hamburguesa de 840 px. Las tablets en horizontal seguirían viendo el Nav de desktop.
- **Sí:** todo lo que significa "Biblioteca" apunta a `/games`, incluido el redirect de Acceso. Tras iniciar sesión el usuario quiere jugar.
- **No:** dejar esos enlaces en `/`. Llevarían a la landing en lugar de a la Biblioteca.
- **Sí:** `/login?mode=register` abre CREAR CUENTA. Los CTA de registro de la landing aterrizan en el formulario correcto.
- **Sí:** leer `mode` en `app/login/page.tsx` vía `searchParams` y pasarlo como prop. `AuthForm` no necesita `useSearchParams` ni un `<Suspense>` extra.
- **Sí:** datos mock 1:1, incluido "12+ JUEGOS" aunque hay 8. Decisión del usuario; la landing es de marketing.
- **Sí:** mini-rail desde `GAMES.slice(0, 6)`. Así los ids enlazan a juegos existentes.
- **Sí:** textos mock en `lib/home.ts`. Separa datos de markup como `lib/games.ts`.
- **Sí:** `IntersectionObserver` en un Client Component mínimo (`RevealObserver`) y el resto de la landing como Server Component. Minimiza JS en cliente.
- **Sí:** respetar `prefers-reduced-motion` con una regla CSS. Accesibilidad sin lógica extra.
- **Sí:** portar solo el CSS de la landing. Sin CSS muerto de About, Gamepad ni Theme variants.
- **No:** redirección de `/` a `/games`. No hay enlaces externos que preservar.
- **Sí:** verificación con `build` + `lint` + checklist manual. Sigue sin framework de tests.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `searchParams` es una `Promise` en Next 16 y hace dinámica `/login` | Consultar `node_modules/next/dist/docs/` antes de escribirlo. `/login` dinámica es aceptable. |
| Si el observer no se ejecuta, las secciones `.reveal` quedan invisibles (`opacity: 0`) | `RevealObserver` se monta en la misma página. La regla de movimiento reducido las muestra siempre. |
| Tailwind sin preflight: `<Link>` hereda subrayado o color en botones, mini-cards y `.lb-link` | Mantener las clases de la plantilla. Si hace falta, corregir en `globals.css` sin tocar el resto del tema. |
| Clases de la nueva `styles.css` que colisionen con las ya portadas en SPEC 01 | Copiar solo los bloques indicados. Comprobar con `grep` que ningún selector nuevo ya exista en `globals.css`. |
| Algún enlace a `/` que signifique "Biblioteca" quede sin actualizar | Buscar `href="/"` y `push("/")` en `app/` y `components/` al terminar el paso 2. Solo el logo y el link Inicio deben quedar en `/`. |
| Siluetas del hero causan scroll horizontal en móvil | `.home-hero` ya tiene `overflow: hidden`. Verificar a 390 px. |

---

## Lo que **no** entra en esta spec

- Página "Acerca de" y su CSS.
- CSS de Gamepad y Theme variants.
- Datos reales en ticker, top 5 o stats.
- Redirección de `/` a `/games`.
- Cambios visuales en las pantallas de SPEC 01.
- Tests automáticos.

Cada uno de estos puntos, si llega, va en su propia spec.

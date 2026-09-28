# SPEC 01 — MVP visual: pantallas de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-09-25
> **Objetivo:** Portar 1:1 a Next.js (App Router) las cinco pantallas de `references/templates/` con datos mock y sin ningún juego real.

---

## Por qué existe esta spec

El repo solo tiene el scaffold y el tema global (`app/globals.css`, ya portado 1:1 desde `references/templates/styles.css`).
Las plantillas de referencia son un prototipo React 18 + Babel en el navegador, con navegación por hash y todo en `window`.
Esta spec traduce ese prototipo a la arquitectura del proyecto: rutas reales del App Router, Server Components por defecto y Client Components solo donde hay interactividad.

---

## Alcance

**Dentro:**

- Pantalla **Biblioteca** (`/`): hero, buscador por nombre, chips de categoría, grilla de `GameCard` con efecto tilt y estado "NO HAY RESULTADOS".
- Pantalla **Detalle** (`/games/[id]`): portada, tags, descripción larga, stat-strip, botones "JUGAR AHORA" y "VOLVER AL VAULT", leaderboard lateral de 10 filas mock.
- Pantalla **Reproductor** (`/games/[id]/play`): HUD (jugador, puntuación, vidas, nivel), botones PAUSA/REANUDAR, FIN y SALIR, arena CRT decorativa, overlay "EN PAUSA", modal "FIN DEL JUEGO" con input de iniciales, guardar puntuación, jugar de nuevo y volver.
- Simulación del Reproductor idéntica a la referencia: la puntuación sube sola cada 220 ms y el nivel sube cuando `score % 2500 < 100`.
- Pantalla **Acceso** (`/login`): tabs INICIAR SESIÓN / CREAR CUENTA, campos usuario, correo (solo en crear cuenta) y contraseña, botón "JUGAR COMO INVITADO", botones sociales GOOGLE/GITHUB decorativos.
- Pantalla **Salón de la Fama** (`/hall-of-fame`): chips por juego, podio top 3, tabla de 12 filas mock y fila "TU MEJOR MARCA" cuando hay usuario.
- **Nav** global: logo, links Biblioteca / Salón de la Fama con estado activo, contador "CRÉDITOS · 03" fijo, botón Iniciar Sesión o `NOMBRE ▾` (cierra sesión), menú hamburguesa con panel móvil.
- **Footer** global: `© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0`.
- Sesión mock en `localStorage` (clave `av_user`) compartida entre Nav, Reproductor y Salón.
- Guardar puntuación en `localStorage` (clave `av_scores`) sin leerla en ninguna pantalla.
- Ids de juego inexistentes en `/games/[id]` y `/games/[id]/play` responden con `notFound()`.

**Fuera de alcance (para futuras specs):**

- Cualquier juego real (lógica, canvas, controles de teclado/táctil).
- Autenticación real, backend, validación de formularios, login social funcional.
- Mostrar en el Salón de la Fama o en el leaderboard las puntuaciones guardadas en `av_scores`.
- Sistema de créditos real (el contador es texto fijo).
- Menú de usuario desplegable (el botón `NOMBRE ▾` solo cierra sesión, como en la referencia).
- Página 404 con diseño propio.
- Framework de tests.
- Rediseño visual respecto a las plantillas.

---

## Modelo de datos

Todo vive en `lib/games.ts`, portado de `references/templates/data.jsx` con tipos.

```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;          // slug, p. ej. "bloque-buster"
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;       // clase CSS, p. ej. "cover-bricks"
  color: NeonColor;
  best: number;
  plays: string;       // "12.4K"
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;        // "DD/MM/2026"
}

export const GAMES: Game[];                        // los 8 juegos de data.jsx, mismo orden
export const CATS: ("TODOS" | Category)[];         // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export function getGame(id: string): Game | undefined;
export function seededScores(seed: number, count?: number): ScoreRow[]; // mismo algoritmo determinista
```

Sesión y puntuaciones mock en `localStorage`:

```ts
// clave "av_user"
type User = { name: string };      // name en mayúsculas, máx. 10 caracteres

// clave "av_scores"
type SavedScore = { game: string; score: number; name: string; at: number }; // array JSON
```

Convenciones:

- Semillas idénticas a la referencia: Detalle usa `seededScores(id.length * 17 + 3, 10)` y Salón usa `seededScores(id.length * 23 + 7, 12)`.
- Números formateados con `toLocaleString("es-ES")`.
- `seededScores` es determinista, así que el HTML del servidor y del cliente coinciden (sin errores de hidratación).

---

## Plan de implementación

1. **Datos.** Crear `lib/games.ts` con tipos, `GAMES`, `CATS`, `getGame` y `seededScores`. `npm run build` pasa.
2. **Sesión mock.** Crear `components/user-provider.tsx` (Client Component) con un contexto que expone `user`, `login(user)` y `logout()`. Lee `av_user` con `useSyncExternalStore` (snapshot de servidor `null`) para evitar desajustes de hidratación. Crear `lib/scores.ts` con `saveScore(entry)` que añade a `av_scores` dentro de `try/catch`.
3. **Layout global.** Crear `components/nav.tsx` (Client, usa `usePathname` para el link activo y `useUser`) y `components/footer.tsx`. Modificar `app/layout.tsx` para envolver `#root` en `UserProvider` y renderizar `Nav`, `<main className="av-main">{children}</main>` y `Footer`. Quitar el `<main>` de `app/page.tsx`. Verificar: el Nav y el footer se ven en `/`, y el panel móvil abre y cierra.
4. **Biblioteca.** Crear `components/game-card.tsx` (Client, tilt con `useRef`) y `components/library.tsx` (Client, búsqueda + chips con `useMemo`). Reemplazar `app/page.tsx` por el hero + `Library`. Las tarjetas y el botón JUGAR navegan a `/games/[id]`. Verificar filtros y estado vacío.
5. **Detalle.** Crear `components/leaderboard.tsx` (Server) y `app/games/[id]/page.tsx` (Server). `params` es una `Promise` en Next 16: consultar `node_modules/next/dist/docs/` antes de escribirlo. Añadir `generateStaticParams` con los 8 ids y `notFound()` si `getGame` devuelve `undefined`. Botones como `<Link>`.
6. **Reproductor.** Crear `components/game-player.tsx` (Client) con la simulación, la pausa, el modal y `saveScore`, y `app/games/[id]/play/page.tsx` (Server) que valida el id y le pasa el `Game`. El nombre inicial es `user.name` o `"INVITADO"`. SALIR va a `/games/[id]`; VOLVER AL VAULT va a `/`.
7. **Acceso.** Crear `components/auth-form.tsx` (Client) y `app/login/page.tsx`. Enviar el formulario llama a `login({ name: (usuario || "PLAYER1").toUpperCase().slice(0, 10) })` y navega a `/` con `useRouter`. "JUGAR COMO INVITADO" llama a `logout()` y navega a `/`.
8. **Salón de la Fama.** Crear `components/hall-of-fame.tsx` (Client, tab activa en `useState`, por defecto el primer juego) y `app/hall-of-fame/page.tsx`. Fila "TU MEJOR MARCA" solo con usuario, con el mismo cálculo mock que la referencia. Botón "VOLVER A LA BIBLIOTECA" a `/`.
9. **Metadatos y limpieza.** `metadata` por página (`title` con el nombre de la pantalla o del juego vía `generateMetadata`). Confirmar que `npm run lint` y `npm run build` pasan.

Todas las pantallas usan el markup y las clases de las plantillas (`.av-hero`, `.card`, `.av-detail`, `.crt`, `.auth-card`, `.podium`, `.hall-table`...), definidas en `app/globals.css`. Se usa `/frontend-design` solo para resolver detalles que la plantilla no define.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores ni warnings de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] La consola del navegador no muestra errores de hidratación en ninguna de las 5 rutas.
- [ ] `/` muestra los 8 juegos. Escribir "caí" deja solo CAÍDA. El chip SHOOTER deja solo INVASORES y ROCAS.
- [ ] Una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Al pasar el ratón por una tarjeta se inclina, y al salir vuelve a su posición.
- [ ] Hacer clic en una tarjeta o en su botón JUGAR abre `/games/<id>`.
- [ ] `/games/caida` muestra título, descripción larga, stat-strip y 10 filas de leaderboard con top 3 resaltado.
- [ ] `/games/no-existe` y `/games/no-existe/play` devuelven 404.
- [ ] "JUGAR AHORA" abre `/games/<id>/play` y la puntuación empieza a subir sola.
- [ ] PAUSA detiene la puntuación y muestra "EN PAUSA". REANUDAR la reanuda.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación final.
- [ ] GUARDAR PUNTUACIÓN añade una entrada `{ game, score, name, at }` a `av_scores` y muestra "PUNTUACIÓN GUARDADA".
- [ ] JUGAR DE NUEVO reinicia puntuación a 0, vidas a 3 y nivel a 01.
- [ ] En `/login`, la tab CREAR CUENTA muestra el campo de correo e INICIAR SESIÓN lo oculta.
- [ ] Enviar el login con usuario "neonfox" redirige a `/` y el Nav muestra `NEONFOX ▾`.
- [ ] Recargar la página mantiene la sesión. Pulsar `NEONFOX ▾` cierra la sesión y el Nav vuelve a mostrar "Iniciar Sesión".
- [ ] Con sesión iniciada, el HUD del Reproductor muestra ese nombre. Sin sesión muestra "INVITADO".
- [ ] `/hall-of-fame` muestra podio, 12 filas y cambia los datos al pulsar otro juego.
- [ ] La fila "TU MEJOR MARCA" aparece solo con sesión iniciada.
- [ ] El link del Nav está activo en Biblioteca para `/`, `/games/*` y `/games/*/play`, y en Salón de la Fama para `/hall-of-fame`.
- [ ] A 390 px de ancho no hay scroll horizontal, se ve el botón hamburguesa y el panel móvil abre y cierra.

---

## Decisiones

- **Sí:** rutas reales del App Router. Cada pantalla tiene URL enlazable y los ids inválidos usan `notFound()`.
- **No:** SPA con estado en el hash como la referencia. Va contra el App Router.
- **Sí:** URLs en inglés (`/games/[id]`, `/games/[id]/play`, `/login`, `/hall-of-fame`). Decisión del usuario; los textos de la UI siguen en español.
- **Sí:** port 1:1 del markup y las clases de las plantillas. `globals.css` ya es el port de `styles.css`.
- **No:** rediseño libre con `/frontend-design`. Solo se usa para huecos que la plantilla no cubre.
- **Sí:** sesión mock en `localStorage` (`av_user`) mediante un contexto cliente. Nav, Reproductor y Salón la necesitan a la vez.
- **Sí:** leer `localStorage` con `useSyncExternalStore` y `getServerSnapshot` que devuelve `null`. En la hidratación el usuario es `null`, igual que en el servidor. Evita errores de hidratación a cambio de un parpadeo breve del botón del Nav.
- **No:** `useEffect` + `setState` para leer `av_user`. La regla `react-hooks/set-state-in-effect` de `eslint-config-next` 16 lo marca como error y rompería el criterio de lint.
- **Sí:** guardar en `av_scores` sin leerlo. Mantiene el comportamiento de la referencia sin ampliar el alcance.
- **No:** mezclar los scores guardados en el Salón. Va en otra spec.
- **Sí:** simular la partida como en la referencia (temporizador de puntuación). Permite ver todos los estados del Reproductor sin juego real.
- **Sí:** Server Components por defecto y Client Components solo en Nav, GameCard, Library, GamePlayer, AuthForm, HallOfFame y UserProvider.
- **Sí:** datos en `lib/games.ts` y componentes en `components/` en la raíz. Encaja con el alias `@/*`.
- **Sí:** `generateStaticParams` para los 8 juegos. Los datos son estáticos.
- **Sí:** verificación con `build` + `lint` + checklist manual. No hay framework de tests.
- **No:** montar tests en esta spec. Va en otra spec.
- **No:** página 404 con diseño propio. Se usa la de Next por defecto.
- **Sí:** ignorar `references/**` en `eslint.config.mjs`. El prototipo usa globales de `window` (`React`, `GAMES`...) y no forma parte de la app; sin esto `npm run lint` no puede pasar.
- **Sí:** `title.template` (`%s · Arcade Vault`) en `app/layout.tsx`, con `title` por página y `generateMetadata` en las rutas de juego.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| APIs de Next 16 distintas a las conocidas (`params` asíncrono, `LayoutProps`, `PageProps`) | Consultar `node_modules/next/dist/docs/` antes de cada ruta, como pide `AGENTS.md`. |
| Errores de hidratación por `localStorage` o `Math.random` | `localStorage` solo en `useSyncExternalStore` (cliente) y handlers. `Math.random` solo dentro del temporizador del Reproductor. `seededScores` es determinista. |
| `localStorage` bloqueado (modo privado) | Todas las lecturas y escrituras dentro de `try/catch`. La app funciona como invitado. |
| Tailwind sin preflight: estilos por defecto del navegador en `<a>` al pasar a `<Link>` | Mantener las clases de la plantilla. Si un `<Link>` hereda subrayado o color, corregirlo en `globals.css` sin tocar el resto del tema. |
| El temporizador sigue corriendo al salir del Reproductor | Limpiar el `setInterval` en el cleanup del `useEffect`. |

---

## Lo que **no** entra en esta spec

- Ningún juego jugable.
- Autenticación real, backend o login social.
- Puntuaciones guardadas visibles en el Salón o en el leaderboard.
- Créditos reales.
- Página 404 personalizada.
- Tests automáticos.
- Rediseño visual.

Cada uno de estos puntos, si llega, va en su propia spec.

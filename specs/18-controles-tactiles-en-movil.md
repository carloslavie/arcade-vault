# SPEC 18 — Controles táctiles para jugar en móvil

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 10, SPEC 11, SPEC 12, SPEC 13
> **Fecha:** 2026-10-19
> **Objetivo:** Permitir jugar los 4 juegos jugables en un dispositivo táctil con un mando virtual por juego bajo o junto a la CRT, que envía al motor los mismos eventos de teclado que ya entiende.

---

## Por qué existe esta spec

Hoy `components/engine-player.tsx` detecta táctil con `TOUCH_QUERY = "(hover: none) and (pointer: coarse)"`.
En ese caso no monta el motor, deshabilita FIN y muestra el overlay **REQUIERE TECLADO**.
SPEC 05 dejó los controles táctiles fuera de alcance, y SPEC 10–12 los repitieron como "futura spec".
Los 4 motores (`asteroids`, `tetris`, `arkanoid`, `snake`) escuchan `keydown` / `keyup` en `window` y leen `e.code`.
Por eso un mando en pantalla que despache `KeyboardEvent` sintéticos con los mismos `code` los controla sin tocar su lógica.
La única excepción es Arkanoid, que además mueve la pala con `mousemove` y pasa a `pointermove` para aceptar el dedo.
Las reglas, velocidades y puntuación no cambian: un récord hecho en móvil va al mismo leaderboard.

---

## Alcance

**Dentro:**

- **El motor se monta también en táctil.** El efecto de `EnginePlayer` deja de exigir `isTouch === false` y solo espera a que `isTouch !== null` (fin de la hidratación).
  - Se elimina el overlay **REQUIERE TECLADO**.
  - El botón FIN deja de deshabilitarse en táctil (solo en `over`).
  - Un teclado físico conectado a una tablet sigue funcionando igual, porque los motores no cambian sus listeners de teclado.
- **Mando virtual** en `components/touch-controls.tsx`, solo cuando `isTouch === true`:
  - Dos grupos: izquierdo y derecho. Cada grupo es una cruceta (`dpad`) o una fila de botones (`row`).
  - La disposición de cada juego sale de un campo nuevo `touch` en `GAME_META` (ver Modelo).
  - Cada botón usa Pointer Events: `pointerdown` → `keydown`, `pointerup` / `pointercancel` / `lostpointercapture` → `keyup`. Hace `setPointerCapture` para que el dedo pueda salirse un poco del botón sin soltarlo.
  - Multitáctil: cada botón gestiona su propio puntero, así que se puede rotar y disparar a la vez en Asteroids.
  - Deslizar el dedo de un botón a otro **no** cambia de botón (el primero sigue pulsado hasta levantar el dedo).
  - Estado visual pulsado (`data-pressed`) mientras el botón está mantenido.
  - Botones con `aria-label` en español (por ejemplo `Rotar a la izquierda`, `Disparar`).
- **Entrada sintética** en `lib/touch-input.ts` (cliente, sin React):
  - `pressKey(code, { repeat })` despacha `new KeyboardEvent("keydown", { code, bubbles: true })` en `window`.
  - Si el botón tiene `repeat: true`, tras `REPEAT_DELAY_MS = 170` reenvía `keydown` con `repeat: true` cada `REPEAT_INTERVAL_MS = 50` hasta soltarlo.
  - `releaseKey(code)` cancela la repetición y despacha `keyup`.
  - `releaseAll()` suelta todas las teclas mantenidas. Se llama al desmontar el mando, al cambiar la fase a algo distinto de `playing` y en `visibilitychange` con `document.hidden`.
  - `tapKey(code)` despacha `keydown` + `keyup` seguidos (para empezar con Espacio).
- **Autorepeat** solo en ◀ ▶ ▼ de Tetris, que mueven por cada `keydown`. El resto de botones no repite: Asteroids, Arkanoid y Snake leen teclas mantenidas o giros sueltos.
- **Empezar y pausar en táctil:**
  - En `ready`, el overlay muestra el título y **TOCA PARA EMPEZAR**, sin la tabla de teclas. Tocar el overlay llama a `tapKey("Space")`.
  - Pausa y reanudación con el botón PAUSA / REANUDAR del HUD, que ya existe.
  - El overlay de pausa en táctil dice **PULSA REANUDAR PARA CONTINUAR**.
  - En escritorio los overlays no cambian.
- **Arrastrar la pala en Arkanoid:** `lib/engines/arkanoid/engine.ts` cambia `mousemove` por `pointermove` en el canvas, con la misma conversión de coordenadas CSS → lógicas. Con dedo, la pala sigue al dedo mientras está apoyado. El ratón sigue funcionando igual.
- **Bloqueo de gestos del navegador** en el área de juego: `touch-action: none` y `user-select: none` (más `-webkit-user-select` y `-webkit-touch-callout: none`) en `.crt` y `.touch-pad`. Tocar o arrastrar ahí no hace scroll, zoom por doble toque, selección ni menú contextual.
  - El resto de la página (HUD, cabecera) mantiene scroll y zoom normales.
- **Vibración:** cada `pointerdown` de un botón del mando llama a `navigator.vibrate?.(10)` dentro de `try/catch`. Donde no exista (iOS Safari) no pasa nada.
- **Pantalla completa:**
  - Botón **PANTALLA COMPLETA** / **SALIR PANTALLA COMPLETA** en `.hud-actions`.
  - Solo se renderiza si `isTouch === true` y `document.fullscreenEnabled` es `true` (no aparece en iPhone Safari).
  - Pide `requestFullscreen()` sobre `.av-player`, que contiene HUD, CRT, mando y modal de fin.
  - El texto se sincroniza con el evento `fullscreenchange`. Un rechazo de la promesa se ignora.
- **Selector de skin en táctil:** `SkinPicker` se muestra si `meta.hasSkins` y la skin no es `null`, sin mirar `isTouch`.
  - En táctil se oculta el texto central de `.crt-bottom` (`{game.title} · CRT-83 · 60 HZ`) para que el selector quepa.
- **Layout táctil** diseñado con `/frontend-design` en `app/globals.css`, coherente con `references/templates/styles.css`:
  - **Vertical:** CRT a todo el ancho y el mando debajo, grupo izquierdo a la izquierda y derecho a la derecha.
  - **Horizontal** (`(orientation: landscape)` dentro del modo táctil): grupo izquierdo | CRT | grupo derecho en una fila. La CRT se limita en alto para que HUD + CRT quepan en `100dvh`.
  - Botones de al menos 56×56 px, separados al menos 8 px.
  - Estética de mando arcade: bordes y glow `--cyan` / `--magenta`, etiquetas en `--pixel`, estado pulsado con glow más intenso.
  - `.hud-actions` hace wrap en pantallas estrechas.
  - El layout táctil cuelga de una clase `.av-player.is-touch` que pone `EnginePlayer`, no de media queries de ancho: una tablet grande también lo recibe.
- **Ajustes surgidos al implementar** (paso 5 y 7):
  - En vertical las flechas miden 56 px y los botones redondos 64 px, para que el mando quepa en 390 px. En horizontal crecen a 60 px y 72 px.
  - En táctil se oculta la etiqueta `MODO` del selector de skin y sus botones son más compactos; `.crt-bottom` puede hacer wrap. Sin esto, `RETRO` quedaba cortado.
  - `.av-player:fullscreen` pone fondo `--bg`, quita el ancho máximo y permite scroll vertical, para que la pantalla completa no muestre el negro por defecto del navegador.

**Fuera de alcance (para futuras specs):**

- Gestos (swipe en Snake/Tetris, tap para disparar).
- Deslizar el dedo de un botón a otro para cambiar de botón.
- Mando configurable, reposicionable o con tamaño ajustable.
- Bloquear la orientación (`screen.orientation.lock`).
- Pantalla completa en escritorio.
- Marcar en `scores` si la partida fue táctil o con teclado, o leaderboards separados.
- Soporte de mandos físicos (Gamepad API).
- Cambiar velocidades o reglas para compensar la dificultad táctil.
- PWA, instalación o modo offline.
- Adaptar al móvil el resto de pantallas (biblioteca, landing, Salón de la Fama) más allá de lo que ya hacen.

---

## Modelo

### Disposición del mando (`lib/engines/meta.ts`, server-safe)

```ts
export type TouchKeyCode =
  "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Space";

export interface TouchButton {
  code: TouchKeyCode; // e.code the engine already reads
  label: string; // glyph or short text on the button
  aria: string; // aria-label in Spanish
  repeat?: boolean; // keyboard-like autorepeat while held
}

export interface TouchCluster {
  kind: "dpad" | "row"; // dpad places buttons by arrow code
  buttons: TouchButton[];
}

export interface GameMeta {
  // ...campos actuales
  touch: { left: TouchCluster; right: TouchCluster | null };
}
```

`touch` es obligatorio en `GameMeta`, así que un juego nuevo no compila sin su mando.

### Mando por juego

| Juego       | Grupo izquierdo                                                        | Grupo derecho                                        |
| ----------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `asteroids` | `row`: ◀ `ArrowLeft` (Rotar izq.), ▶ `ArrowRight` (Rotar der.)         | `row`: ▲ `ArrowUp` (Propulsar), ● `Space` (Disparar) |
| `tetris`    | `dpad`: ◀ ▼ ▶ (`ArrowLeft`, `ArrowDown`, `ArrowRight`), `repeat: true` | `row`: ↻ `ArrowUp` (Rotar), ⤓ `Space` (Caída)        |
| `arkanoid`  | `row`: ◀ `ArrowLeft`, ▶ `ArrowRight`                                   | `null` (la pala también se arrastra en la CRT)       |
| `snake`     | `dpad`: ▲ ◀ ▶ ▼ (las 4 flechas)                                        | `null`                                               |

Con `right: null` el grupo izquierdo queda a la izquierda y el derecho no se renderiza.

### Entrada sintética (`lib/touch-input.ts`, cliente)

| Nombre               | Tipo / valor                                                | Uso                                        |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------ |
| `REPEAT_DELAY_MS`    | `170`                                                       | Espera antes del primer `keydown` repetido |
| `REPEAT_INTERVAL_MS` | `50`                                                        | Intervalo entre `keydown` repetidos        |
| `pressKey`           | `(code: TouchKeyCode, opts?: { repeat?: boolean }) => void` | `keydown` y autorepeat opcional            |
| `releaseKey`         | `(code: TouchKeyCode) => void`                              | Cancela repetición y despacha `keyup`      |
| `releaseAll`         | `() => void`                                                | Suelta todo lo mantenido                   |
| `tapKey`             | `(code: TouchKeyCode) => void`                              | `keydown` + `keyup` (empezar con Espacio)  |

Estado interno: un `Map<TouchKeyCode, { count: number; timer: number | null }>`. `count` evita soltar una tecla mientras otro botón con el mismo `code` sigue pulsado.

No hay datos nuevos en Supabase ni en `localStorage`. El contrato `GameFactory` / `GameInstance` de `lib/engines/types.ts` no cambia.

---

## Plan de implementación

1. **Datos del mando.** Añadir `TouchKeyCode`, `TouchButton`, `TouchCluster` y el campo `touch` a `GameMeta` en `lib/engines/meta.ts`, con la tabla de los 4 juegos. Nadie lo usa todavía; `npm run lint` y el build pasan.
2. **Entrada sintética.** Crear `lib/touch-input.ts` con `pressKey`, `releaseKey`, `releaseAll`, `tapKey` y el autorepeat. Prueba manual en escritorio: desde la consola, `tapKey("Space")` empieza la partida.
3. **Componente del mando.** Crear `components/touch-controls.tsx` (`TouchControls({ layout })`) con los grupos `dpad` / `row`, Pointer Events, `setPointerCapture`, `data-pressed`, `aria-label`, vibración y `releaseAll()` al desmontar. Aún no se monta.
4. **Player en táctil.** En `components/engine-player.tsx`: montar el motor cuando `isTouch !== null`, quitar REQUIERE TECLADO, habilitar FIN, añadir `is-touch` a `.av-player`, overlay de `ready` táctil con **TOCA PARA EMPEZAR** (`tapKey("Space")`), hint de pausa táctil, montar `TouchControls` con `meta.touch`, `releaseAll()` cuando la fase deja `playing` y en `visibilitychange`. Mostrar `SkinPicker` sin depender de `isTouch` y ocultar el texto central de `.crt-bottom` en táctil.
5. **Estilos táctiles** con `/frontend-design` en `app/globals.css`: `.touch-pad`, `.touch-cluster`, `.touch-btn`, layout vertical y horizontal bajo `.av-player.is-touch`, `touch-action` / `user-select`, wrap de `.hud-actions`.
6. **Arkanoid con dedo.** En `lib/engines/arkanoid/engine.ts`, cambiar `mousemove` por `pointermove` (alta y baja del listener, y tipo `PointerEvent`). Prueba: con ratón se juega igual que antes.
7. **Pantalla completa.** Botón en `.hud-actions` con `requestFullscreen()` / `exitFullscreen()` sobre `.av-player`, sincronizado con `fullscreenchange`, visible solo con `isTouch === true` y `document.fullscreenEnabled`.
8. **Documentación.** Actualizar en `CLAUDE.md` la línea de `components/engine-player.tsx` (táctil ya no es "REQUIERE TECLADO", sino mando virtual) y mencionar `GAME_META.touch` en `meta.ts`.

---

## Criterios de aceptación

Verificación con Playwright emulando un móvil táctil (`hasTouch: true`, `isMobile: true`, 390×844 y 844×390) y en escritorio sin emulación. Si hay un móvil real disponible, se repite en él.

Verificado el 2026-10-19 con Playwright (Chromium emulado). Queda pendiente repetirlo en un móvil real.

- [x] En táctil, `/games/<id>/play` de los 4 juegos ya no muestra **REQUIERE TECLADO**.
- [x] En táctil, el overlay de `ready` muestra **TOCA PARA EMPEZAR** y tocarlo pasa la fase a `playing`.
- [x] En táctil se ve el mando del juego con los botones de la tabla del Modelo y ninguno más.
- [x] Asteroids: mantener ◀ rota la nave de forma continua y soltarlo la detiene.
- [x] Asteroids: mantener ▲ y pulsar ● a la vez propulsa y dispara (multitáctil).
- [x] Tetris: un toque en ◀ mueve la pieza una columna; mantenerlo la mueve varias columnas.
- [x] Tetris: ↻ rota la pieza una vez por toque y ⤓ la deja caer.
- [x] Arkanoid: mantener ▶ mueve la pala a la derecha; arrastrar el dedo sobre la CRT mueve la pala bajo el dedo.
- [x] Arkanoid en escritorio: el ratón sigue moviendo la pala.
- [x] Snake: las 4 flechas de la cruceta giran la serpiente y respetan la cola de giros de SPEC 12.
- [x] PAUSA pausa la partida y REANUDAR la continúa; en pausa el hint dice **PULSA REANUDAR PARA CONTINUAR**.
- [x] FIN está habilitado en táctil y termina la partida.
- [x] Al pausar con un botón del mando mantenido, ninguna tecla queda "pegada" al reanudar.
- [x] Tocar o arrastrar sobre la CRT o el mando no hace scroll ni zoom de la página.
- [x] En 390×844 (vertical) el mando está debajo de la CRT sin scroll horizontal.
- [x] En 844×390 (horizontal) los grupos del mando están a los lados de la CRT y HUD + CRT caben en la altura de la ventana.
- [x] Cada botón del mando mide al menos 56×56 px.
- [x] El selector de skin aparece en táctil y cambiar de skin no reinicia la partida.
- [x] En un navegador con `document.fullscreenEnabled`, el botón PANTALLA COMPLETA pone `.av-player` en pantalla completa y su texto cambia a SALIR PANTALLA COMPLETA.
- [x] Sin `document.fullscreenEnabled`, el botón no aparece.
- [ ] Una partida táctil terminada con sesión iniciada guarda la puntuación y aparece en el leaderboard del juego. _(Sin verificar: no había credenciales de prueba. El guardado usa el mismo `persist` que en escritorio, que esta spec no toca.)_
- [x] En escritorio (sin emulación táctil) no se ve el mando, los overlays son los de antes y los 4 juegos se juegan igual con teclado.
- [x] La consola no muestra errores en ninguno de los 4 juegos, en táctil ni en escritorio.
- [x] `npm run lint` y `npm run build` pasan.

---

## Decisiones

- **Sí:** mando virtual con botones. Es descubrible y funciona en los 4 juegos, incluido Asteroids con tres acciones simultáneas.
- **No:** gestos (swipe / tap). Menos descubribles y malos para Asteroids. Pueden llegar en otra spec como complemento.
- **Sí:** `KeyboardEvent` sintéticos en `window` con los mismos `e.code`. Cero cambios en la lógica de los motores y en el contrato `GameFactory`.
- **No:** ampliar `GameInstance` con `press` / `release`. Más explícito, pero obliga a tocar los 4 motores y `types.ts` sin ganar nada visible.
- **Sí:** autorepeat propio solo en ◀ ▶ ▼ de Tetris (170 ms / 50 ms). Tetris depende del autorepeat del SO, que los eventos sintéticos no tienen.
- **Sí:** arrastrar la pala en Arkanoid con `pointermove`. Es el equivalente táctil del ratón y el único cambio de motor; los botones ◀ ▶ quedan como alternativa.
- **Sí:** tocar la CRT en `ready` para empezar, y pausar con el botón PAUSA del HUD. Reutiliza lo que ya existe en vez de duplicar START / PAUSA en el mando.
- **Sí:** soportar vertical y horizontal con layouts distintos. Nadie queda bloqueado por la orientación.
- **No:** forzar orientación o mostrar "GIRA EL DISPOSITIVO". Bloquea al jugador sin necesidad.
- **Sí:** mismo leaderboard para táctil y teclado, sin marcar el dispositivo. Un récord es un récord y no hace falta migración.
- **Sí:** detección táctil con el `TOUCH_QUERY` actual (`hover: none` y `pointer: coarse`). Un portátil con pantalla táctil y ratón sigue en modo escritorio.
- **Sí:** layout táctil por clase `.is-touch` y no por ancho de pantalla. Una tablet grande también necesita el mando.
- **Sí:** `touch-action: none` solo en CRT y mando. **No:** desactivar el zoom en el `viewport` de toda la web, por accesibilidad.
- **Sí:** vibración de 10 ms donde exista `navigator.vibrate`. Sin soporte no pasa nada.
- **Sí:** pantalla completa solo en táctil y solo si `document.fullscreenEnabled`. En iPhone Safari no existe, así que el botón no aparece en vez de fallar.
- **Sí:** selector de skin también en táctil, ocultando el texto decorativo central de `.crt-bottom` para que quepa.
- **No:** deslizar de un botón a otro. Con `setPointerCapture` el comportamiento es predecible; el deslizamiento puede ir en otra spec.

---

## Riesgos

| Riesgo                                                                                                        | Mitigación                                                                                                              |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Una tecla queda "pegada" si se pierde el `pointerup` (notificación, cambio de app, pausa con el dedo apoyado) | `pointercancel`, `lostpointercapture`, `releaseAll()` al salir de `playing`, en `visibilitychange` y al desmontar.      |
| `KeyboardEvent` sintéticos con `isTrusted: false` ignorados por algún motor                                   | Ningún motor mira `isTrusted` hoy. Si un motor nuevo lo hiciera, debe documentarlo en su spec.                          |
| En horizontal, la barra del navegador móvil reduce el alto y la CRT no cabe                                   | Alto calculado con `100dvh`; pantalla completa como solución donde exista.                                              |
| iOS Safari no soporta `vibrate` ni Fullscreen API en iPhone                                                   | Ambas funciones se detectan y se omiten sin errores.                                                                    |
| Los listeners de `window` de los motores reciben a la vez teclado físico y mando                              | Es el comportamiento deseado (tablet con teclado). El `count` del `Map` evita soltar una tecla que otro botón mantiene. |
| El arrastre en Arkanoid mueve la pala al tocar los botones ◀ ▶                                                | El listener `pointermove` está en el `<canvas>`, y el mando está fuera de la CRT.                                       |

Detectado al verificar, fuera de alcance: en 844×390 la cabecera `.av-nav` (contador de monedas y botón de sesión) desborda y estira la página a 1146 px de ancho. Ya pasaba antes de esta spec y va en una spec propia de adaptación móvil del resto de pantallas.

---

## Lo que **no** entra en esta spec

- Gestos (swipe, tap para disparar) y deslizar entre botones.
- Mando configurable o reposicionable.
- Bloqueo de orientación.
- Pantalla completa en escritorio.
- Distinguir puntuaciones táctiles en `scores` o en el leaderboard.
- Gamepad API.
- Ajustes de dificultad para móvil.
- PWA u offline.
- Rediseño móvil del resto de pantallas.

Cada una de esas, si llega, va en su propia spec.

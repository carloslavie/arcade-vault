# SPEC 03 — Página "Acerca de" en `/about` con formulario de contacto vía Resend

> **Estado:** Implementado  
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-09-28
> **Objetivo:** Portar 1:1 en `/about` la página "Acerca de" de `references/templates/home-about/about.jsx` y hacer que su formulario de contacto envíe un correo real al equipo con Resend mediante una Server Action.

---

## Por qué existe esta spec

SPEC 02 dejó "Acerca de" visible pero deshabilitado en el Nav y dejó fuera el CSS `ABOUT PAGE`.
La plantilla `about.jsx` solo simula el envío: valida campos vacíos y muestra una terminal de éxito.
Esta spec porta la página tal cual y conecta el formulario a un envío real, lo que añade estados que la plantilla no define (carga y error), configuración por variables de entorno y validación en el servidor.

---

## Alcance

**Dentro:**

- Ruta `/about` portada 1:1 desde `about.jsx`, con estas secciones en este orden:
  - **Hero:** kicker "▸ ACERCA DE", título "ACERCA DE ARCADE VAULT", párrafo de misión y 3 highlights con icono pixel (HEART magenta, BROWSER cian, PLANT verde).
  - **Divisor:** dos barras y 24 píxeles parpadeando (`.about-divider`, `.reveal`).
  - **Contacto** (`.reveal`): kicker "▸ CONTACTO", título "CONTÁCTANOS", subtítulo, 3 tips con LED y formulario con NOMBRE, CORREO ELECTRÓNICO y MENSAJE, botón "▶  ENVIAR MENSAJE".
- Animación `.reveal` reutilizando `RevealObserver` (SPEC 02).
- Validación en cliente igual que la plantilla: si algún campo está vacío tras `trim`, el formulario hace `shake` 400 ms y no se envía.
- Envío con una Server Action que:
  - Valida en servidor: los tres campos no vacíos tras `trim`, correo con formato válido, nombre ≤ 60, correo ≤ 254, mensaje ≤ 2000 caracteres.
  - Descarta en silencio los envíos con el honeypot relleno: responde éxito sin llamar a Resend.
  - Envía un correo en texto plano con Resend a `CONTACT_TO_EMAIL`, desde `CONTACT_FROM_EMAIL`, con `replyTo` = correo del usuario.
- **Estado de carga:** mientras la acción está pendiente, el botón muestra "▶  TRANSMITIENDO…" y el botón y los campos quedan deshabilitados.
- **Estado de éxito:** la terminal `.terminal-success` de la plantilla, con el nombre en mayúsculas y el botón "ENVIAR OTRO MENSAJE", que vuelve al formulario vacío.
- **Estado de error:** la misma terminal en variante error (borde y línea final en magenta) con líneas `[ERR]` y botón "REINTENTAR", que vuelve al formulario con los datos intactos.
- Nav (desktop y panel móvil): "Acerca de" pasa a ser un `<Link href="/about">` activo solo en `/about`. Se eliminan el `<span aria-disabled>` y sus reglas CSS `.disabled`.
- Variables de entorno `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL`, documentadas en `.env.example` (commiteado) y en una sección del README.
- Portar a `app/globals.css` el bloque `ABOUT PAGE` de `references/templates/home-about/styles.css`, más las reglas nuevas de la variante error de la terminal y del honeypot.
- Con `prefers-reduced-motion: reduce`, los píxeles del divisor no parpadean (además de la regla `.reveal` ya existente).

**Fuera de alcance (para futuras specs):**

- Correo de confirmación al usuario que escribe.
- Plantilla HTML del correo (React Email o similar).
- Rate limiting por IP, CAPTCHA o Turnstile.
- Verificar un dominio propio en Resend (es configuración de la cuenta, no de código).
- Guardar los mensajes en una base de datos o en `localStorage`.
- Rellenar nombre o correo automáticamente desde la sesión mock `av_user`.
- CSS de `GAMEPAD` y `Theme variants` de la referencia.
- Framework de tests.

---

## Modelo de datos

No hay persistencia nueva. Los tipos y la validación compartida viven en `lib/contact.ts` (importable desde cliente y servidor, sin dependencias de Node):

```ts
export interface ContactInput { name: string; email: string; msg: string }

export const CONTACT_LIMITS = { name: 60, email: 254, msg: 2000 } as const;

export type ContactErrorCode = "invalid" | "send_failed";

export type ContactState =
  | { status: "idle" }
  | { status: "ok"; name: string }                          // nombre ya recortado
  | { status: "error"; code: ContactErrorCode };

// Devuelve los datos recortados o null si no cumplen las reglas
export function validateContact(input: ContactInput): ContactInput | null;
```

Server Action en `app/about/actions.ts`:

```ts
"use server";
export async function sendContact(prev: ContactState, formData: FormData): Promise<ContactState>;
```

Campos del `FormData`: `name`, `email`, `msg` y el honeypot `website`.

Variables de entorno (`.env.local`, nunca commiteado):

```bash
RESEND_API_KEY=            # re_...
CONTACT_TO_EMAIL=          # buzón del equipo
CONTACT_FROM_EMAIL=        # sin dominio verificado: "Arcade Vault <onboarding@resend.dev>"
```

Correo enviado:

- **Asunto:** `[ARCADE VAULT] Mensaje de <nombre>`
- **Cuerpo (texto plano):**

  ```
  Nombre: <nombre>
  Correo: <correo>

  <mensaje>
  ```

Mapeo de errores:

| Situación | Código | Texto en la terminal |
| --- | --- | --- |
| Validación de servidor falla | `invalid` | `> ERROR DE TRANSMISIÓN. REVISA LOS DATOS DEL FORMULARIO.` |
| Falta alguna variable de entorno | `send_failed` | `> ERROR DE TRANSMISIÓN. INTÉNTALO DE NUEVO MÁS TARDE.` |
| Resend devuelve `error` o lanza excepción | `send_failed` | `> ERROR DE TRANSMISIÓN. INTÉNTALO DE NUEVO MÁS TARDE.` |

Los casos `send_failed` se registran en el servidor con `console.error` (sin el contenido del mensaje). El usuario nunca ve detalles internos.

---

## Plan de implementación

1. **Dependencia y entorno.** `npm install resend`. Crear `.env.example` con las tres claves vacías y el comentario del remitente de prueba. Añadir `!.env.example` al `.gitignore`. Añadir al README (en español) una sección "Formulario de contacto" con las tres variables y la nota de que con `onboarding@resend.dev` Resend solo entrega al correo de la cuenta. Verificar: `git status` muestra `.env.example` como archivo nuevo.
2. **CSS.** Copiar a `app/globals.css`, dentro de `@layer components`, el bloque `ABOUT PAGE` de `references/templates/home-about/styles.css` (de `.about` hasta `.term-body .caret`). Comprobar con `grep` que ningún selector ni `@keyframes` (`shake`, `pxblink`, `blink`) choca con uno existente; si `blink` ya existe, reutilizarlo. Añadir:
   - `.terminal-success.error` (borde y sombra magenta) y `.term-body .error` (magenta, mismo peso y sombra que `.success`).
   - `.contact-form .hp-field` fuera de pantalla (`position: absolute; left: -9999px`).
   - `.div-pixels span { animation: none; }` dentro del `@media (prefers-reduced-motion: reduce)` existente.
   `npm run build` pasa.
3. **Nav.** En `components/nav.tsx`, sustituir los dos `<span className="disabled" aria-disabled="true">` por `<Link href="/about" className={cls("/about")}>` (el del panel móvil con `onClick={close}`). Eliminar de `globals.css` las reglas `.av-nav .links .disabled` y `.av-mobile-panel .disabled`. Verificar: el link lleva a `/about` (404 por ahora) y ya no está atenuado.
4. **Página estática.** Añadir `HighlightIcon({ kind })` a `components/pixel-art.tsx` con los 3 SVG de la referencia (atributos en JSX, `fill="#0a0a0f"` literal como en la plantilla). Crear `components/about.tsx` (Server) con hero, highlights (`transitionDelay` `i * 80` ms), divisor (24 `span` con `animationDelay` `i * 80` ms) y la columna `.contact-intro`. Crear `app/about/page.tsx` con `metadata.title = "Acerca de"`, `<About />` y `<RevealObserver />`. En este paso el hueco del formulario renderiza el formulario estático de la plantilla sin lógica. Verificar a 1280 px y a 390 px.
5. **Validación compartida.** Crear `lib/contact.ts` con los tipos, `CONTACT_LIMITS` y `validateContact` (regex simple `^[^\s@]+@[^\s@]+\.[^\s@]+$`).
6. **Server Action.** Crear `app/about/actions.ts` (consultar antes `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`). Orden: si `website` viene relleno → `{ status: "ok", name }` sin enviar; validar con `validateContact` → `invalid`; comprobar las tres variables → `send_failed` + `console.error`; instanciar `new Resend(key)` dentro de la acción; `resend.emails.send({ from, to, replyTo, subject, text })`; si hay `error` o excepción → `send_failed` + `console.error`; si no → `{ status: "ok", name }`.
7. **Formulario cliente.** Crear `components/contact-form.tsx` (Client) con el markup de la plantilla:
   - Inputs controlados (`useState`) con `name="name" | "email" | "msg"`, placeholders y `rows={5}` de la plantilla, `maxLength` según `CONTACT_LIMITS`.
   - Honeypot `<div className="hp-field" aria-hidden="true">` con `<input name="website" tabIndex={-1} autoComplete="off">`.
   - `useActionState(sendContact, { status: "idle" })` y `<form action={formAction}>`. `onSubmit` hace `preventDefault` + `shake` si algún campo está vacío.
   - Pendiente: botón y campos `disabled`, texto "▶  TRANSMITIENDO…".
   - Resultado: se muestra la terminal cuando `state.status !== "idle"` y `state` no es el último resultado descartado (estado local `dismissed`). "ENVIAR OTRO MENSAJE" descarta y vacía los campos; "REINTENTAR" descarta y conserva los campos.
   - Terminal de éxito idéntica a la plantilla. Terminal de error: mismas `.term-bar` y línea de prompt, luego `[OK] Conectando con servidor…`, `[ERR] Transmisión interrumpida.` y la línea final `.error` según el mapeo de errores, con caret.
   Sustituir el formulario estático de `components/about.tsx` por `<ContactForm />`. Se usa `/frontend-design` solo para los huecos que la plantilla no define (variante error y estado de carga).
8. **Cierre.** Con `.env.local` real, enviar un mensaje de prueba y comprobar que llega. Confirmar que `npm run lint` y `npm run build` pasan y que `/about` aparece en la salida del build.

---

## Criterios de aceptación

- [x] `npm run build` termina sin errores ni warnings de tipos.
- [x] `npm run lint` termina sin errores.
- [x] La consola del navegador no muestra errores de hidratación en `/about`.
- [x] `/about` muestra, en orden: kicker, título, misión, 3 highlights, divisor y sección de contacto, con los textos exactos de `about.jsx`.
- [x] Los 3 highlights muestran sus iconos pixel en magenta, cian y verde, y se elevan al hacer hover.
- [x] El divisor y la sección de contacto aparecen con fundido al entrar en pantalla.
- [x] Con `prefers-reduced-motion: reduce` emulado, todo es visible sin scroll y los píxeles del divisor no parpadean.
- [x] El título de la pestaña es "Acerca de" con el sufijo del layout.
- [x] En el Nav (desktop y panel móvil), "Acerca de" es un enlace a `/about`, no está atenuado y está activo solo en `/about`.
- [x] `grep -r "aria-disabled" components` no devuelve resultados.
- [x] Enviar con algún campo vacío (o solo espacios) hace `shake` y no dispara ninguna petición.
- [x] Mientras se envía, el botón muestra "▶  TRANSMITIENDO…" y no se puede pulsar ni editar ningún campo.
- [x] Con `.env.local` válido, enviar el formulario muestra la terminal verde con `GRACIAS, <NOMBRE>.` y el correo llega a `CONTACT_TO_EMAIL` con el asunto `[ARCADE VAULT] Mensaje de <nombre>`, el cuerpo en texto plano y `Reply-To` = correo introducido.
- [x] "ENVIAR OTRO MENSAJE" vuelve al formulario con los tres campos vacíos.
- [x] Sin `RESEND_API_KEY` en el entorno, el envío muestra la terminal magenta con "INTÉNTALO DE NUEVO MÁS TARDE." y el servidor registra el error.
- [x] Un correo con formato inválido que salte la validación del navegador (p. ej. enviado quitando `type="email"` en DevTools) muestra la terminal de error con "REVISA LOS DATOS DEL FORMULARIO." y no llama a Resend.
- [x] "REINTENTAR" vuelve al formulario con los datos introducidos intactos.
- [x] Rellenar el campo `website` desde DevTools y enviar muestra la terminal de éxito y no llega ningún correo.
- [x] El honeypot no es visible ni alcanzable con Tab.
- [x] `RESEND_API_KEY` no aparece en ningún chunk de `.next/static` (`grep -r "RESEND" .next/static` vacío).
- [x] `.env.example` está commiteado con las tres claves y `.env.local` sigue ignorado.
- [x] A 390 px de ancho, `/about` no tiene scroll horizontal y highlights y contacto se apilan en una columna.

---

## Decisiones

- **Sí:** port 1:1 del markup, textos y clases de `about.jsx`. Mismo criterio que SPEC 01 y SPEC 02.
- **Sí:** ruta `/about`. Coherente con `/games`, `/hall-of-fame` y `/login`.
- **Sí:** Server Action con `useActionState`. Patrón nativo de Next 16 para mutaciones; no expone un endpoint público.
- **No:** Route Handler `/api/contact`. Más código y más superficie expuesta sin ningún consumidor que lo necesite.
- **Sí:** destinatario, remitente y API key por variables de entorno, con `replyTo` = correo del usuario. Permite responder desde el buzón y cambiar el destino sin tocar código.
- **No:** destino fijo en código.
- **Sí:** correo en texto plano. Sin dependencias extra y sin riesgo de inyección HTML con el contenido del usuario.
- **No:** React Email. Queda para una spec futura si se quiere un correo con marca.
- **No:** correo de confirmación al usuario. Con `onboarding@resend.dev` Resend solo entrega al correo de la cuenta, así que fallaría hasta verificar un dominio.
- **Sí:** estado de error como variante magenta de la terminal con "REINTENTAR". Mantiene la estética de la plantilla.
- **No:** mensaje de error inline sobre el botón.
- **Sí:** estado de carga con "▶  TRANSMITIENDO…" y campos deshabilitados. Cambio mínimo sobre la plantilla y evita doble envío.
- **No:** terminal animada durante la carga.
- **Sí:** validación manual en `lib/contact.ts`, compartida por cliente y servidor. Sin dependencias.
- **No:** Zod. Un solo formulario no lo justifica.
- **Sí:** honeypot que responde éxito sin enviar. El bot no sabe que fue descartado.
- **No:** rate limiting. En serverless necesita almacenamiento externo; merece su propia spec.
- **Sí:** mensajes de error genéricos para el usuario y detalle solo en el log del servidor. No se filtra configuración interna.
- **Sí:** instanciar `Resend` dentro de la acción, no a nivel de módulo. Sin API key el build no falla y la acción responde `send_failed`.
- **Sí:** `.env.example` commiteado y sección en el README. Documenta la configuración necesaria para quien clone el repo.
- **Sí:** quitar las reglas `.disabled` del Nav. Ya no hay ningún link deshabilitado; sería CSS muerto.
- **Sí:** verificación con `build` + `lint` + checklist manual. Sigue sin framework de tests.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Con `onboarding@resend.dev`, Resend rechaza destinatarios distintos al correo de la cuenta | Usar como `CONTACT_TO_EMAIL` el correo de la cuenta Resend hasta verificar un dominio. Documentado en README y `.env.example`. |
| La API key acaba en el bundle del cliente | Solo se lee en `app/about/actions.ts` (`"use server"`), nunca con prefijo `NEXT_PUBLIC_`. Criterio de aceptación con `grep` sobre `.next/static`. |
| React 19 resetea el formulario tras la acción y se pierden los datos para "REINTENTAR" | Los inputs son controlados con `useState`; el reset automático solo afecta a campos no controlados. Verificar en el criterio de "REINTENTAR". |
| `@keyframes shake`, `blink` o `pxblink` ya existen en `globals.css` con otra definición | Comprobar con `grep` en el paso 2; reutilizar si son idénticos, renombrar si difieren. |
| Doble envío por doble clic | Botón deshabilitado mientras `isPending`. |
| API de Server Actions distinta en Next 16 respecto a lo conocido | Leer `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` antes del paso 6. |
| Spam masivo pese al honeypot | Aceptado en esta spec. Rate limit o CAPTCHA en una spec futura si ocurre. |

---

## Lo que **no** entra en esta spec

- Correo de confirmación al usuario.
- Plantilla HTML del correo.
- Rate limiting o CAPTCHA.
- Verificación de dominio en Resend.
- Persistencia de mensajes.
- Autorrelleno desde la sesión mock.
- CSS de Gamepad y Theme variants.
- Tests automáticos.

Cada uno de estos puntos, si llega, va en su propia spec.

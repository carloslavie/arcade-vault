# MÓVIL · Formularios

> **Estado:** Borrador
> **Depende de:** SPEC 02, SPEC 03, SPEC 04
> **Fecha:** 2026-10-19
> **Objetivo:** Que los campos de `/login`, `/about` y el buscador de `/games` no provoquen zoom automático en iOS, usen el teclado y el autocompletado correctos y tengan objetivos táctiles de 44 px.

---

## Por qué existe esta spec

Todos los inputs heredan `font-size: 14px` de `body`, y el `<textarea>` de contacto se queda en 13,33 px porque `textarea` no está en la regla `button, input, select { font: inherit }`.
iOS Safari hace zoom al enfocar cualquier campo de menos de 16 px, y el usuario tiene que deshacerlo a mano.
Además, el formulario de contacto no declara `autocomplete`, el buscador no es `type="search"` y no tiene etiqueta accesible.

---

## Problemas detectados

| Ruta                   | Viewport            | Evidencia medida                                                                                                      | Causa (selector y archivo)                                                                                    |
| ---------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/login`               | 4 táctiles          | `#auth-username`, `#auth-email`, `#auth-password` con `font-size: 14px`                                               | `.field input` sin `font-size`; hereda 14 px de `body`. `app/globals.css`                                     |
| `/about`               | 4 táctiles          | `#contact-name` y `#contact-email` 14 px, `#contact-msg` 13,33 px                                                     | `.field input`; `.contact-form textarea` sin `font-size` y fuera de la regla `font: inherit` de `@layer base` |
| `/about`               | 4 táctiles          | `#contact-name` y `#contact-email` sin `autocomplete`                                                                 | `components/contact-form.tsx`                                                                                 |
| `/games`               | 4 táctiles          | Buscador `font-size: 13px`, `type="text"`, sin `aria-label`. El `<input>` mide 308×22 dentro de `.av-search` de 48 px | `.av-search input { font-size: 13px }` sin alto. `components/library.tsx`                                     |
| `/login?mode=register` | 4 táctiles          | `#auth-username` sin `autocapitalize` ni `spellcheck`: el teclado propone correcciones en un nombre como `PX_KAI`     | `components/auth-form.tsx`                                                                                    |
| `/login`               | `movil-h`, `tablet` | Pestañas `INICIAR SESIÓN` / `CREAR CUENTA` de 190×38                                                                  | `.auth-tabs button { padding: 12px }`. A 390 px miden más porque el texto parte en 2 líneas                   |
| `/login`               | 4 táctiles          | `O CONTINÚA CON` a 8 px                                                                                               | `.auth-divider { font-size: 8px }`                                                                            |

Sin problemas: en los 4 viewports táctiles el botón de enviar (`ENTRAR AL VAULT`, `▶ ENVIAR MENSAJE`) se ve entero y no hay scroll horizontal propio de los formularios (el que se mide viene de `.av-nav`, ver `nav-movil.md`).
Los campos tienen el `type` correcto (`email`, `password`) y `#auth-email` / `#auth-password` ya declaran `autocomplete`.

---

## Alcance

**Dentro:**

- En `@media (max-width: 1100px)` de `app/globals.css`: `font-size: 16px` en `.field input`, `.contact-form textarea` y `.av-search input`.
- `.av-search input` con `align-self: stretch` para que todo el alto de 48 px de `.av-search` enfoque el campo.
- `.auth-tabs button` con `min-height: 44px` en el mismo bloque.
- `.auth-divider` con `font-size: 10px` en el mismo bloque.
- Atributos:
  - `components/contact-form.tsx`: `autoComplete="name"` en `#contact-name`, `autoComplete="email"` en `#contact-email`.
  - `components/auth-form.tsx`: `autoCapitalize="characters"`, `autoCorrect="off"` y `spellCheck={false}` en `#auth-username`; `autoCapitalize="none"` y `spellCheck={false}` en `#auth-email`.
  - `components/library.tsx`: buscador con `type="search"`, `enterKeyHint="search"` y `aria-label="Buscar un juego"`.
- Diseño con `/frontend-design`, coherente con `references/templates/styles.css`: el texto de 16 px usa `--mono` igual que ahora.

**Fuera de alcance (para futuras specs):**

- Validación, mensajes de error o flujo de los formularios.
- Tamaño de los campos en escritorio (> 1100 px).
- Botones `.btn` de los formularios, incluidos los sociales deshabilitados `◆ GOOGLE` / `▣ GITHUB` (los cubre `base-movil.md`).
- `.modal .input-row input`: es una regla del prototipo que hoy no se renderiza en ninguna pantalla.

---

## Plan de implementación

1. **Tamaño de fuente.** En `app/globals.css`, bloque `@media (max-width: 1100px)` con `font-size: 16px` para los 3 selectores. Comprobar con `getComputedStyle` en 390 px.
2. **Buscador.** `.av-search input { align-self: stretch }` en `globals.css` y atributos `type`, `enterKeyHint` y `aria-label` en `components/library.tsx`. Comprobar que el input mide ≥ 44 px de alto.
3. **Pestañas y separador.** `.auth-tabs button { min-height: 44px }` y `.auth-divider { font-size: 10px }` en el mismo bloque.
4. **Autocompletado.** Atributos de `components/contact-form.tsx` y `components/auth-form.tsx`. Comprobar en el DOM.

---

## Criterios de aceptación

- [ ] Sin scroll horizontal en `movil-v`, `movil-h`, `pequeno` y `tablet` en `/login`, `/login?mode=register`, `/about` y `/games` (con `nav-movil.md` ya aplicada).
- [ ] En los 4 viewports táctiles, `#auth-username`, `#auth-email`, `#auth-password`, `#contact-name`, `#contact-email`, `#contact-msg` y el buscador de `/games` calculan `font-size` ≥ 16 px.
- [ ] `#contact-name` tiene `autocomplete="name"` y `#contact-email` `autocomplete="email"`.
- [ ] `#auth-username` tiene `autocapitalize="characters"` y `spellcheck="false"`.
- [ ] El buscador de `/games` tiene `type="search"`, `enterkeyhint="search"` y `aria-label="Buscar un juego"`, y mide al menos 44 px de alto.
- [ ] Las pestañas de `/login` miden al menos 44 px de alto en `movil-h` y `tablet`.
- [ ] `O CONTINÚA CON` calcula `font-size: 10px` en 390 px.
- [ ] El botón de enviar de `/login` y de `/about` está entero dentro del ancho del viewport en los 4 viewports táctiles.
- [ ] En `desktop` no hay cambios visuales: en 1440×900 los inputs siguen en 14 px, el buscador en 13 px y las pestañas en 38 px.
- [ ] La consola no muestra errores en ninguna ruta ni viewport.

---

## Decisiones

- **Sí:** 16 px solo por debajo de 1100 px. Evita el zoom de iOS sin tocar el aspecto de escritorio.
- **No:** `maximum-scale=1` o `user-scalable=no` en el `viewport` para evitar el zoom. Bloquearía el zoom manual, que es una ayuda de accesibilidad.
- **Sí:** `autoCapitalize="characters"` en el usuario. El campo ya fuerza mayúsculas en `onChange`, así el teclado lo refleja.
- **No:** `inputMode` extra. `type="email"` y `type="search"` ya eligen el teclado correcto.
- **No:** tocar `.modal .input-row input`. No se usa en ninguna pantalla y no hay nada que medir.
- **No:** separar las pestañas de `/login` 8 px. Son un control segmentado: dos opciones excluyentes dentro del mismo borde, donde la separación la da el estado activo.

---

## Riesgos

| Riesgo                                                        | Mitigación                                                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| El placeholder de 16 px no cabe en el buscador de 360 px      | El texto ya hace elipsis en el input; se comprueba en 360 px que no se sale.                    |
| `type="search"` añade la "x" nativa de borrar con otro estilo | Se valida con `/frontend-design`; si desentona, se oculta con `::-webkit-search-cancel-button`. |

---

## Lo que **no** entra en esta spec

- Lógica, validación o mensajes de los formularios.
- Aspecto de escritorio.
- Tamaño de `.btn` (va en `base-movil.md`).

Cada una de esas, si llega, va en su propia spec.

> Para implementarla, se mueve a `specs/21-formularios-movil.md` (siguiente número libre después de `base-movil.md`), pasa a `Aprobado` y se ejecuta `/spec-impl 21-formularios-movil`.

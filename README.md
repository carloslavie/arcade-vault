## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```
## Commands

- `npm run dev`: dev server at http://localhost:3000 (it also rewrites `AGENTS.md`)
- `npm run build`: production build (also type-checks)
- `npm run start`: serve the production build
- `npm run lint`: ESLint (flat config in `eslint.config.mjs`, using `eslint-config-next` core-web-vitals + typescript)
- `npx tsc --noEmit`: type-check only

## Frontend-design skill (para diseñar la interfaz del usuario)
npx skills add https://github.com/anthropics/skills --skill frontend-design

## ui-ux-pro-max-skill (otra skill recomendada para crear interfaces del usuario)
npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max
## Formulario de contacto

El formulario de `/about` envía los mensajes con [Resend](https://resend.com). Copia `.env.example` a `.env.local` y rellena:

- `RESEND_API_KEY`: API key de Resend (`re_...`).
- `CONTACT_TO_EMAIL`: buzón que recibe los mensajes.
- `CONTACT_FROM_EMAIL`: remitente, p. ej. `Arcade Vault <onboarding@resend.dev>`.

Con el remitente de prueba `onboarding@resend.dev`, Resend solo entrega al correo de tu cuenta de Resend, así que `CONTACT_TO_EMAIL` debe ser ese correo hasta que verifiques un dominio propio.

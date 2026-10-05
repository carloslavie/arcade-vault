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

## Supabase

La autenticación (correo y contraseña) y la tabla `profiles` viven en Supabase. La app solo usa la **publishable key**; nunca pongas la secret key (`sb_secret_...` / `service_role`) en el repo ni en variables `NEXT_PUBLIC_*`.

### Variables de entorno

Añade a `.env.local` (Project Settings → API en el dashboard):

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto, `https://<ref>.supabase.co`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key (`sb_publishable_...`).

### Migraciones y tipos

El esquema está versionado en `supabase/migrations/` y se trabaja directamente contra el proyecto remoto (sin Docker ni `supabase start`). La CLI viene como dependencia de desarrollo. Ejecuta estos comandos en una terminal normal: `login` abre el navegador, y `link` y `db push` piden la contraseña de la base de datos.

```bash
npx supabase login                                  # una vez por equipo
npx supabase link --project-ref iiouvcygbimkdjbzjoqu # una vez por clon
npx supabase db push                                # aplica las migraciones pendientes
npm run db:types                                    # regenera lib/supabase/database.types.ts
```

Para un cambio de esquema: `npx supabase migration new <nombre>`, escribe el SQL, `npx supabase db push` y `npm run db:types`. No cambies el esquema solo desde el dashboard.

### Configuración de Auth (manual, en el dashboard)

En **Authentication → Sign In / Providers → Email**:

- Desactiva **Confirm email**. Así el registro deja la sesión iniciada al momento (si está activa, `signUp` no devuelve sesión).
- Deja **Minimum password length** en `6`.

Supabase limita los intentos de login y registro por IP. Si durante las pruebas aparece `> ERROR DE CONEXIÓN…` tras muchos intentos seguidos, espera unos minutos o ajusta los límites en **Authentication → Rate Limits**.

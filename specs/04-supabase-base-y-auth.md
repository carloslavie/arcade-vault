# SPEC 04 — Integración base de Supabase y autenticación con correo y contraseña

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-05
> **Objetivo:** Conectar la app a Supabase (clientes, proxy de sesión, migraciones y tipos) y sustituir el login mock de `localStorage` por Supabase Auth con correo y contraseña y un perfil con nombre de usuario único.

---

## Por qué existe esta spec

Desde SPEC 01 la sesión es un mock: `AuthForm` acepta cualquier credencial y guarda `{ name }` en `localStorage` (`av_user`) mediante `UserProvider`.
El proyecto Supabase (`iiouvcygbimkdjbzjoqu`) ya está conectado por MCP, pero no tiene ninguna tabla en `public`, y la app no tiene ni SDK ni variables de entorno.
Las puntuaciones reales necesitarán usuarios reales y una tabla `profiles` con la que relacionarse. Por eso esta spec monta la infraestructura y la auth, y deja las puntuaciones para la siguiente.

---

## Alcance

**Dentro:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Supabase CLI como dependencia de desarrollo (`supabase`). Carpeta `supabase/` (creada con `supabase init`) con `config.toml` y `migrations/`, versionada en git y enlazada al proyecto remoto. No se usa Docker ni `supabase start`.
- Clientes tipados:
  - Navegador: `lib/supabase/client.ts` (`createBrowserClient`).
  - Servidor: `lib/supabase/server.ts` (`createServerClient` sobre `cookies()`), con el helper `getCurrentUser()`.
  - Proxy: `lib/supabase/proxy.ts` (`updateSession`).
- `proxy.ts` en la raíz que **solo** refresca la sesión en cada petición (sin redirecciones ni rutas protegidas). Excluye estáticos e imágenes.
- Migración `create_profiles`:
  - Tabla `public.profiles`.
  - Trigger `on_auth_user_created` que crea el perfil desde `raw_user_meta_data.username`.
  - RLS activado, con lectura pública y sin escritura desde el cliente.
- Tipos generados en `lib/supabase/database.types.ts`.
- Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.example`. Se elimina `SUPABASE_DB_PASSWORD` de `.env.example`.
- Sección "Supabase" en el README: variables, `supabase link`, `supabase db push`, regenerar tipos y desactivar la confirmación de correo en el dashboard.
- Configuración de Auth en el proyecto remoto: confirmación de correo **desactivada**, contraseña mínima de 6.
- `AuthForm` conectado a Supabase con Server Actions en `app/login/actions.ts`:
  - **INICIAR SESIÓN:** Correo electrónico + Contraseña. El campo "Usuario" desaparece de esta pestaña.
  - **CREAR CUENTA:** Usuario + Correo electrónico + Contraseña. Registro = sesión iniciada al instante.
  - Si sale bien, en ambos casos se redirige a `/games`.
  - **Estado de carga:** el botón muestra "▶ CONECTANDO…", y el botón y los campos quedan deshabilitados.
  - **Estado de error:** línea de error en magenta sobre el botón de envío, con los datos intactos (ver mapeo de errores).
- "JUGAR COMO INVITADO" llama a la acción `signOut` y redirige a `/games`.
- Botones GOOGLE y GITHUB visibles pero `disabled`, con `title="Próximamente"`.
- `/login` redirige a `/games` si ya hay sesión.
- Usuario actual:
  - `app/layout.tsx` lee el usuario actual en el servidor (`getCurrentUser()`) y se lo pasa a `UserProvider` como `initialUser`.
  - `UserProvider` deja de leer y escribir `av_user`, mantiene la API `useUser()` → `{ user, logout }` y se suscribe a `onAuthStateChange` y escucha `visibilitychange` para hacer `router.refresh()` cuando la sesión cambia en otra pestaña.
- Nav (desktop y panel móvil): el botón `{user.name} ▾` cierra sesión con la acción `signOut` y se queda en la página actual.

**Fuera de alcance (para futuras specs):**

- Puntuaciones en Supabase y Salón de la Fama con datos reales (`av_scores` sigue en `localStorage`).
- OAuth con Google o GitHub.
- Confirmación de correo, recuperación de contraseña y cambio de contraseña.
- Editar el nombre de usuario o borrar la cuenta.
- Rutas protegidas.
- Desarrollo local con Docker (`supabase start`) y ramas de Supabase.
- Migrar o borrar la clave antigua `av_user` del navegador (simplemente se ignora).
- Rate limiting propio (se usa el de Supabase Auth).
- Framework de tests.

---

## Modelo de datos

### Base de datos (`supabase/migrations/<timestamp>_create_profiles.sql`)

```sql
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique
             check (username ~ '^[A-Z0-9_]{3,10}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- Sin políticas de insert/update/delete: solo escribe el trigger.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, upper(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

-- Solo se ejecuta como trigger, nunca vía /rest/v1/rpc
-- (migración aparte: <timestamp>_revoke_handle_new_user_execute.sql).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

El nombre se guarda siempre en mayúsculas, así que el `unique` ya trata `kai` y `KAI` como el mismo nombre.

### Variables de entorno (`.env.local`, nunca commiteado)

```bash
NEXT_PUBLIC_SUPABASE_URL=                 # https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=     # sb_publishable_...
```

### Tipos de la app

`lib/auth.ts` (importable desde cliente y servidor, sin dependencias de Node):

```ts
export const AUTH_LIMITS = {
  username: { min: 3, max: 10 },
  email: 254,
  password: { min: 6, max: 72 },
} as const;
export const USERNAME_RE = /^[A-Z0-9_]{3,10}$/;

export type AuthErrorCode =
  | "invalid" // validación local
  | "invalid_credentials"
  | "username_taken"
  | "email_taken"
  | "weak_password"
  | "unknown";

export type AuthState =
  { status: "idle" } | { status: "error"; code: AuthErrorCode };

export interface SignInInput {
  email: string;
  password: string;
}
export interface SignUpInput {
  username: string;
  email: string;
  password: string;
}

// Devuelven los datos normalizados (trim; username en mayúsculas) o null
export function validateSignIn(input: SignInInput): SignInInput | null;
export function validateSignUp(input: SignUpInput): SignUpInput | null;
```

`components/user-provider.tsx`:

```ts
export type User = { id: string; name: string }; // name = profiles.username
```

`lib/supabase/server.ts`:

```ts
export async function createClient(): Promise<SupabaseClient<Database>>;
// null si no hay sesión o si el perfil no existe
export async function getCurrentUser(): Promise<User | null>;
```

`app/login/actions.ts`:

```ts
"use server";
export async function signIn(
  prev: AuthState,
  formData: FormData,
): Promise<AuthState>;
export async function signUp(
  prev: AuthState,
  formData: FormData,
): Promise<AuthState>;
export async function signOut(redirectTo?: string): Promise<void>;
```

Campos del `FormData`: `email` y `password` (login), y además `username` (registro).

### Mapeo de errores

| Situación                                                                    | Código                | Texto bajo el formulario                                                     |
| ---------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| Validación local falla                                                       | `invalid`             | `> REVISA LOS DATOS. USUARIO: 3–10 LETRAS, NÚMEROS O _. CONTRASEÑA: MÍN. 6.` |
| Correo o contraseña incorrectos                                              | `invalid_credentials` | `> CREDENCIALES INCORRECTAS.`                                                |
| El usuario ya existe (comprobación previa en `profiles` o fallo del trigger) | `username_taken`      | `> ESE NOMBRE DE USUARIO YA ESTÁ EN USO.`                                    |
| El correo ya está registrado                                                 | `email_taken`         | `> ESE CORREO YA TIENE UNA CUENTA.`                                          |
| Supabase rechaza la contraseña                                               | `weak_password`       | `> CONTRASEÑA DEMASIADO DÉBIL.`                                              |
| Faltan variables de entorno, error de red o cualquier otro                   | `unknown`             | `> ERROR DE CONEXIÓN. INTÉNTALO DE NUEVO MÁS TARDE.`                         |

Los casos `unknown` se registran en el servidor con `console.error`, sin la contraseña. El usuario nunca ve mensajes internos de Supabase.

---

## Plan de implementación

1. **Dependencias y entorno.**
   - `npm install @supabase/supabase-js @supabase/ssr` y `npm install -D supabase`.
   - En `.env.example`, eliminar `SUPABASE_DB_PASSWORD` y añadir un bloque "Supabase" con las dos variables y sus comentarios.
   - Rellenar `.env.local` con la URL y la publishable key (obtenidas con el MCP: `get_project_url`, `get_publishable_keys`).
   - Verificar: `npm run build` pasa.
2. **CLI y migración.**
   - `npx supabase init` (sin generar ajustes de VS Code/Deno) y `npx supabase link --project-ref iiouvcygbimkdjbzjoqu`.
   - Crear `supabase/migrations/<timestamp>_create_profiles.sql` con el SQL del modelo de datos y aplicarlo con `npx supabase db push`.
   - Verificar con el MCP: `list_tables` muestra `profiles` con RLS activado y `get_advisors` (security) no muestra avisos sobre `profiles` ni `handle_new_user`.
3. **Configuración de Auth.** En el dashboard (Authentication → Sign In / Providers → Email), desactivar "Confirm email" y dejar la longitud mínima de contraseña en 6. Documentarlo en el README.
4. **Tipos.**
   - Generar `lib/supabase/database.types.ts` con `npx supabase gen types typescript --linked` (o con el MCP `generate_typescript_types`).
   - Añadir el script `"db:types"` a `package.json`.
5. **Clientes y proxy.**
   - Consultar antes `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` y la referencia `file-conventions/proxy`.
   - Crear `lib/supabase/client.ts`, `lib/supabase/server.ts` (`createClient` con `await cookies()` y `setAll` dentro de `try/catch`) y `lib/supabase/proxy.ts` (`updateSession`, que llama a `supabase.auth.getUser()`).
   - Crear `proxy.ts` en la raíz con `export async function proxy(request)` y un `matcher` que excluya `_next/static`, `_next/image`, `favicon.ico` e imágenes.
   - Añadir `getCurrentUser()` en `server.ts`: hace `auth.getUser()`, lee el `username` de `profiles` y devuelve `{ id, name }` o `null`.
   - Verificar: `npm run build` pasa y la app carga igual que antes.
6. **Validación compartida.** Crear `lib/auth.ts` con los tipos, `AUTH_LIMITS`, `USERNAME_RE`, `validateSignIn` y `validateSignUp` (regex de correo `^[^\s@]+@[^\s@]+\.[^\s@]+$`, igual que en `lib/contact.ts`).
7. **Server Actions.** Crear `app/login/actions.ts` (consultar antes `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`).
   - `signIn`: valida, llama a `signInWithPassword`, mapea el error, y si sale bien hace `revalidatePath("/", "layout")` y `redirect("/games")`.
   - `signUp`: valida y comprueba si el `username` ya existe en `profiles` (`username_taken`). Después llama a `auth.signUp({ email, password, options: { data: { username } } })` y mapea los errores:
     - `user_already_exists` / `email_exists` → `email_taken`.
     - `weak_password` → `weak_password`.
     - Error de base de datos del trigger → `username_taken`.
       Si sale bien, `revalidatePath` + `redirect("/games")`.
   - `signOut(redirectTo)`: `auth.signOut()` + `revalidatePath("/", "layout")`, y `redirect(redirectTo)` si se pasa.
8. **UserProvider y layout.**
   - Reescribir `components/user-provider.tsx`:
     - Recibe `initialUser: User | null` y expone `{ user, logout }`, donde `logout` llama a `signOut()` y se elimina `login`.
     - En un `useEffect` se suscribe a `createClient().auth.onAuthStateChange` y llama a `router.refresh()` en `SIGNED_IN` / `SIGNED_OUT` cuando el id cambia respecto a `user`.
     - En el mismo `useEffect` escucha `visibilitychange`: al volver a la pestaña lee `auth.getSession()` y hace `router.refresh()` si el id no coincide con `user`. Hace falta porque un `signOut` en el servidor desde otra pestaña borra la cookie sin emitir `SIGNED_OUT` en esta.
     - Se elimina todo el código de `localStorage`.
   - `app/layout.tsx` pasa a `async`, llama a `getCurrentUser()` y pasa el resultado a `<UserProvider initialUser={...}>`.
   - Verificar que `Nav`, `GamePlayer` y `HallOfFame` compilan sin cambios: siguen usando `user.name`.
9. **Formulario.** Adaptar `components/auth-form.tsx` (usar `/frontend-design` solo para la línea de error y el estado de carga):
   - Dos `useActionState`: uno con `signIn` y otro con `signUp`, según la pestaña.
   - Inputs controlados para que los datos se mantengan tras un error y al cambiar de pestaña.
   - Login: campos `email` (type email) y `password`. Registro: `username` (`maxLength` 10, se muestra en mayúsculas), `email` y `password`.
   - Pendiente: "▶ CONECTANDO…" y todo `disabled`. Error: `<p className="auth-error" role="alert">` con el texto del mapeo.
   - Invitado: `startTransition(() => signOut("/games"))`.
   - OAuth: `disabled` y `title="Próximamente"`.
   - Añadir a `globals.css` la regla `.auth-error` (magenta, mono, `font-size: 11px`, `letter-spacing: 0.1em`).
10. **Rutas.**
    - En `app/login/page.tsx`, si `getCurrentUser()` devuelve usuario, `redirect("/games")`.
    - En `components/nav.tsx`, el botón de usuario llama a `logout()`, que ya usa `signOut` sin redirección.
11. **Documentación.** Añadir al README (en español) la sección "Supabase" con:
    - Las variables de entorno.
    - Los comandos `supabase link`, `supabase db push` y `npm run db:types`.
    - El paso manual de desactivar "Confirm email".
12. **Cierre.**
    - Registrar una cuenta de prueba, cerrar sesión y volver a entrar.
    - Comprobar en el MCP (`execute_sql`) que existe la fila en `profiles`.
    - Recorrer todos los criterios de aceptación.
    - `npm run lint` y `npm run build` pasan.

---

## Criterios de aceptación

- [x] `npm run build` termina sin errores ni warnings de tipos.
- [x] `npm run lint` termina sin errores.
- [x] La consola del navegador no muestra errores de hidratación en `/`, `/games`, `/login` ni `/hall-of-fame`.
- [x] `supabase/migrations/` contiene la migración de `profiles` y `supabase/config.toml` está commiteado.
- [x] `list_tables` (MCP) muestra `public.profiles` con RLS activado.
- [x] `get_advisors` de seguridad no muestra avisos sobre `profiles` ni sobre `handle_new_user`.
- [x] `lib/supabase/database.types.ts` existe e incluye la tabla `profiles`.
- [x] `.env.example` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, y no contiene `SUPABASE_DB_PASSWORD`.
- [x] `.env.local` sigue ignorado por git.
- [x] Crear una cuenta con usuario `kai_01`, un correo nuevo y una contraseña de 6+ caracteres redirige a `/games` y el Nav muestra `KAI_01 ▾`.
- [x] Tras el registro, `select username from profiles` devuelve `KAI_01`.
- [x] Recargar la página con sesión iniciada muestra `KAI_01 ▾` desde el primer render (sin pasar por "Entrar").
- [x] Pulsar `KAI_01 ▾` cierra la sesión, se queda en la página actual y el Nav vuelve a mostrar el botón de acceso.
- [x] Iniciar sesión con ese correo y esa contraseña redirige a `/games` con la sesión activa.
- [x] Una contraseña incorrecta muestra `> CREDENCIALES INCORRECTAS.` y conserva el correo escrito.
- [x] Registrar otra cuenta con el usuario `KAI_01` (o `kai_01`) muestra `> ESE NOMBRE DE USUARIO YA ESTÁ EN USO.` y no crea ningún usuario en `auth.users`.
- [x] Registrar otra cuenta con el mismo correo muestra `> ESE CORREO YA TIENE UNA CUENTA.`
- [x] Un usuario de 2 caracteres o con espacios, o una contraseña de 5 caracteres, muestra el error `invalid` y no llama a Supabase.
- [x] Mientras la acción está pendiente, el botón muestra "▶ CONECTANDO…" y no se puede pulsar ni editar ningún campo.
- [x] Sin `NEXT_PUBLIC_SUPABASE_URL` en el entorno, enviar el formulario muestra `> ERROR DE CONEXIÓN…` y el servidor registra el error.
- [x] "JUGAR COMO INVITADO" con sesión activa la cierra y lleva a `/games` como invitado.
- [x] Visitar `/login` con sesión activa redirige a `/games`.
- [x] `/games/[id]/play` sigue siendo jugable sin sesión.
- [x] Los botones GOOGLE y GITHUB están deshabilitados.
- [x] Cerrar sesión en una pestaña actualiza el Nav de otra pestaña abierta al volver a ella (sin recargar a mano).
- [x] `grep -r "av_user" components lib app` no devuelve resultados.
- [x] Ninguna clave secreta (`service_role` / `sb_secret_`) aparece en el repo ni en `.next/static`.

---

## Decisiones

- **Sí:** spec dividida. Esta spec cubre la infraestructura y la auth. Las puntuaciones y el Salón real van en la siguiente porque tocan otra área (esquema de scores, ranking) con sus propias decisiones.
- **Sí:** `@supabase/ssr` con cookies. Es el paquete oficial para el App Router; la sesión llega al servidor y permite leer el usuario en el layout.
- **No:** `@supabase/auth-helpers-nextjs`. Está deprecado.
- **Sí:** `proxy.ts` solo para refrescar la sesión. En Next 16 Middleware pasa a llamarse Proxy, y su documentación desaconseja usarlo como capa de autorización.
- **Sí:** migraciones con Supabase CLI versionadas en `supabase/migrations/`. El esquema es reproducible y revisable en PRs.
- **No:** cambios de esquema solo por dashboard o MCP sin archivo SQL.
- **Sí:** trabajar solo contra el proyecto remoto. No hace falta Docker y basta un único entorno para el tamaño actual del proyecto.
- **No:** `supabase start` local.
- **Sí:** quitar `SUPABASE_DB_PASSWORD` de `.env.example`. La app no la necesita en runtime; la CLI la pide de forma interactiva en `link` y `db push`.
- **Sí:** login con correo y contraseña. Es lo nativo de Supabase.
- **No:** login con nombre de usuario. Exigiría una RPC que revela qué usuarios existen.
- **Sí:** tabla `profiles` creada por trigger con `username` único. La spec de puntuaciones la necesitará para los joins, y la unicidad la garantiza la BD.
- **No:** guardar el nombre solo en `user_metadata`. Ni es único ni se puede consultar.
- **Sí:** usuario de 3–10 caracteres `A-Z 0-9 _`, guardado en mayúsculas, con `CHECK` en la BD. Mantiene el formato de 10 caracteres en mayúsculas del mock y de las tablas de puntuación.
- **Sí:** confirmación de correo desactivada. El registro deja la sesión iniciada al momento, como el mock, y el SMTP por defecto de Supabase tiene un límite muy bajo.
- **Sí:** Server Actions con `useActionState`. Es el mismo patrón que el contacto en SPEC 03 y las cookies se escriben en el servidor.
- **No:** llamar a `signInWithPassword` desde el cliente.
- **Sí:** usuario inicial leído en el layout del servidor y pasado a `UserProvider`. No hay parpadeo de invitado y se mantiene la API `useUser()` de los consumidores.
- **No:** obtener la sesión solo en el cliente.
- **Sí:** `onAuthStateChange` + `visibilitychange` → `router.refresh()`. Sincroniza otras pestañas sin duplicar estado. Solo con `onAuthStateChange` no basta: un cierre de sesión hecho en el servidor no emite `SIGNED_OUT` en las demás pestañas.
- **Sí:** comprobar el `username` en `profiles` antes de `signUp`. Evita crear usuarios huérfanos en el caso normal; si hay una carrera, el trigger falla y se mapea igualmente a `username_taken`.
- **Sí:** errores en una línea magenta sobre el botón. Es un cambio mínimo sobre la plantilla del formulario.
- **No:** reutilizar la terminal de SPEC 03. En un formulario corto de acceso sería desproporcionado.
- **Sí:** OAuth visible pero deshabilitado. La UI de la plantilla se conserva y queda claro que llegará después.
- **No:** rutas protegidas. El modo invitado sigue siendo una característica.
- **Sí:** ignorar `av_user` sin migrarlo. No hay usuarios reales y el mock no tiene contraseña que migrar.
- **Sí:** verificación con `build` + `lint` + checklist manual + comprobaciones por MCP. Sigue sin framework de tests.

---

## Riesgos

| Riesgo                                                                                                | Mitigación                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leer cookies en el root layout hace dinámicas todas las rutas                                         | Aceptado: la sesión es necesaria en el Nav de todas las páginas. Revisar la salida de `npm run build` y anotarlo. Si afecta al rendimiento, se tratará en otra spec (p. ej. cargar el Nav con `Suspense`). |
| El trigger falla (nombre duplicado o inválido) y `signUp` devuelve un error genérico de base de datos | Validación y comprobación previa en la acción. Si aun así falla, se mapea a `username_taken`, y como la transacción hace rollback no se crea ningún usuario.                                               |
| `security definer` en `handle_new_user` abre una vía de escalada                                      | `set search_path = ''`, nombres totalmente cualificados y revisión con `get_advisors`.                                                                                                                     |
| API de `@supabase/ssr` o de Proxy distinta a la conocida                                              | Leer la guía de Supabase para Next.js (`search_docs` del MCP) y `16-proxy.md` antes del paso 5.                                                                                                            |
| Con la confirmación de correo activa por defecto, `signUp` no devuelve sesión                         | Paso 3 explícito. El criterio de aceptación del registro lo detecta.                                                                                                                                       |
| Supabase limita los intentos de login y registro por IP durante las pruebas                           | Esperar o ajustar los límites en el dashboard. Se documenta en el README.                                                                                                                                  |
| Se filtra una clave secreta al cliente                                                                | Solo se usa la publishable key. Criterio de aceptación con `grep` sobre el repo y `.next/static`.                                                                                                          |
| `revalidatePath` + `redirect` desde la acción no refresca el Nav                                      | `UserProvider` toma el usuario de la prop del layout en cada render del servidor. Se verifica en los criterios de registro, login y logout.                                                                |

---

## Lo que **no** entra en esta spec

- Puntuaciones en Supabase y Salón de la Fama real.
- OAuth con Google o GitHub.
- Confirmación de correo, recuperación y cambio de contraseña.
- Edición de perfil y borrado de cuenta.
- Rutas protegidas.
- Supabase local con Docker y ramas.
- Migración de `av_user`.
- Tests automáticos.

Cada uno de estos puntos, si llega, va en su propia spec.

# Spec template — new playable game

Pre-filled skeleton for `/add-game`. Copy the structure, replace every `<placeholder>`, and delete the blocks marked **[CONDICIONAL]** that do not apply (and the marker itself). Follow the global rules of `.claude/skills/spec/template.md`: one sentence per idea, concrete names, no TODOs, no long code. Match the wording of the latest specs in `specs/` if it has drifted from this template.

---

```markdown
# SPEC NN — <TÍTULO> jugable con puntuaciones y leaderboard

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06<, SPEC 07, SPEC 08, SPEC 09 si se tocan>
> **Fecha:** <fecha de la sesión>
> **Objetivo:** <Portar el <juego> de `references/started-games/<carpeta>/` | Crear un <juego> nuevo> como motor TypeScript jugable en `/games/<id>/play`, con sus puntuaciones guardadas en `scores` y visibles en el leaderboard, la biblioteca y el Salón de la Fama.

---

## Por qué existe esta spec

<2–4 frases: qué hay hoy (fila mock / nada), qué tiene el original (globals, HUD propio, DOM externo, assets) y qué cambia. Mencionar que el resto de la plataforma (saveScore, leaderboard, estadísticas, Salón de la Fama) ya es genérica y se activa con `isPlayable`.>

---

## Alcance

**Dentro:**

- **[CONDICIONAL] Preparación de la plataforma** (solo los puntos pendientes de `integration-checklist.md`):
  - `lib/engines/meta.ts` con `GAME_META` (`scoreStep`, `initialLives`, `hud`, `controls`) y entrada de `asteroids` con sus valores actuales.
  - `EnginePlayer` lee controles, estadísticas iniciales y celdas del HUD de `GAME_META`.
  - `validateScore` usa el `scoreStep` del juego; migración que relaja el `CHECK` de `scores` a `score between 1 and 10000000`.
  - `GameStats` con `<lines?: number>`.
  - Asteroids se comporta exactamente igual que antes.
- **Motor de <juego> en TypeScript**, sin React, en `lib/engines/<id>/`:
  - Port 1:1 de `<archivo>`: <constantes clave: tamaños, velocidades, puntos, vidas, progresión de nivel>.
  - Resolución lógica <W×H>; <cómo encaja en la CRT 4:3>. Buffer × `devicePixelRatio`.
  - Estética neón: <entidad → `--color`>. Glow con `shadowBlur`. Colores de `:root` con fallback.
  - Del HUD original en el canvas solo queda <indicador sin equivalente | nada>. <Stats> salen por `onStats`.
  - El canvas no dibuja pausa ni game over.
  - <Se eliminan: DOM externo, botón de tema, atajos de depuración…>
- **Fases** `ready → playing ⇄ paused → over`, igual que SPEC 05 (Espacio empieza; P/Esc y pérdida de foco pausan; nunca se reanuda sola). <Fases internas del original> cuentan como `playing`.
- **Controles:** <tabla de teclas>. `P` / `Esc` pausa. <Ratón sí/no>. Sin WASD.
- **Catálogo:** <fila nueva `<id>` | la fila `<old>` pasa a `<id>` con título `<TÍTULO>`>, mediante migración.
- **Registro:** `<id>` en `PLAYABLE_GAME_IDS`, `ENGINES` y `GAME_META` (`scoreStep: <n>`, `initialLives: <n|null>`, `hud: [<…>]`).
- **[CONDICIONAL] Assets** en `public/games/<id>/`: <lista>.
- CSS solo si hace falta (<portada `.cover-<…>` | overlay específico>), diseñado con `/frontend-design`.

**Fuera de alcance (para futuras specs):**

- <Sonido.>
- Controles táctiles y jugabilidad en móvil.
- Mejoras sobre el original (<ejemplos concretos mencionados en la conversación>).
- Antitrampas real.
- <Lo que el usuario haya aplazado.>

---

## Modelo de datos

### [CONDICIONAL] Migración — `supabase/migrations/<timestamp>_relax_scores_step_check.sql`

<SQL corto: drop del constraint actual (nombre verificado con MCP) y add con `score between 1 and 10000000`.>

### Migración — `supabase/migrations/<timestamp>_<add|rename>_<id>.sql`

<SQL del insert en `games` o del renombrado (patrón drop FK → update games y scores → add FK). Textos `short`/`long` literales con `''` escapado.>

### [CONDICIONAL] Metadatos (`lib/engines/meta.ts`)

<Interfaz `GameMeta` y `GAME_META` con las entradas `asteroids` y `<id>`.>

### Archivos del motor

- `lib/engines/<id>/entities.ts`: <entidades>.
- `lib/engines/<id>/engine.ts`: `create<Name>Game: GameFactory`.
- <`lib/engines/<id>/levels.ts`: datos de niveles.>

### Puntuación

| Acción   | Puntos |
| -------- | ------ |
| <acción> | <n>    |

`scoreStep = <n>`. Máximo 10.000.000.

---

## Plan de implementación

1. **[CONDICIONAL] Preparación de la plataforma.** `meta.ts`, `EnginePlayer` y `validateScore` leyendo metadatos, migración del `CHECK`. Verificar: Asteroids idéntico, `npm run build` pasa.
2. **Migración del catálogo.** Crear y aplicar con `npx supabase db push`. <`npm run db:types` si cambia el esquema.> Verificar con MCP `execute_sql` la fila de `games`.
3. **Motor.** Leer `.claude/skills/add-game/porting-guide.md`. Portar `<archivo>` a `lib/engines/<id>/`. <Detalles específicos: layout, input, assets.>
4. **Registro.** Añadir `<id>` a `PLAYABLE_GAME_IDS`, `ENGINES` y `GAME_META`. Verificar: `/games/<id>/play` monta el motor.
5. **[CONDICIONAL] UI.** Ejecutar `/frontend-design` para <portada / overlay específico>.
6. **Cierre.** Partida como invitado y con sesión, comprobación con MCP, criterios de aceptación, `npm run lint` y `npm run build`.

---

## Criterios de aceptación

Generales de integración:

- [ ] `npm run build` termina sin errores ni warnings de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] La consola no muestra errores ni avisos de hidratación en `/games`, `/games/<id>`, `/games/<id>/play` y `/hall-of-fame`.
- [ ] `/games` muestra la tarjeta de <TÍTULO> y `/hall-of-fame` su pestaña.
- [ ] `/games/<id>/play` muestra el canvas en la CRT con el overlay de inicio y los controles de <TÍTULO>; el juego no avanza hasta pulsar Espacio.
- [ ] El canvas se ve nítido con `devicePixelRatio` 2 y sin deformar.
- [ ] El canvas no dibuja puntuación, <vidas, nivel>, pausa ni game over.
- [ ] Flechas y Espacio no hacen scroll durante la partida.
- [ ] P, Esc y el botón PAUSA pausan y reanudan; cambiar de pestaña o salir de la ventana pausa y no se reanuda sola.
- [ ] El HUD React muestra <Puntuación, …> y se actualiza durante la partida.
- [ ] <Condición de fin> abre el modal con PUNTUACIÓN FINAL<y NIVEL>.
- [ ] Con sesión, el modal pasa a `▸ PUNTUACIÓN GUARDADA_` y `select * from scores order by id desc limit 1` devuelve `game_id = '<id>'` con esa puntuación.
- [ ] Una partida produce una sola fila en `scores` (también con Strict Mode).
- [ ] Sin sesión, el modal invita a iniciar sesión y no se inserta nada.
- [ ] Tras guardar, `/games/<id>` muestra la marca en el leaderboard y en las estadísticas.
- [ ] `saveScore({ gameId: "<id>", score: <valor no múltiplo de scoreStep o 0> })` devuelve `invalid`.
- [ ] JUGAR DE NUEVO empieza una partida nueva directamente con los valores iniciales.
- [ ] SALIR y VOLVER AL VAULT desmontan el juego: las flechas vuelven a hacer scroll y no queda ningún `requestAnimationFrame`.
- [ ] Emulando un dispositivo táctil, se muestra "REQUIERE TECLADO" y no arranca el motor.
- [ ] `get_advisors` (security y performance) no muestra avisos nuevos.

[CONDICIONAL] Preparación de la plataforma:

- [ ] Asteroids sigue igual: controles, HUD con Vidas y Nivel, y `saveScore({ gameId: "asteroids", score: 15 })` devuelve `invalid`.

Jugabilidad (específicos del juego, booleanos y comprobables):

- [ ] <p. ej. "Completar 4 líneas en el nivel 1 suma 800".>
- [ ] <p. ej. "Al llegar a 10 líneas el HUD pasa a NIVEL 02 y la caída se acelera".>

---

## Decisiones

- **Sí:** motor TypeScript sin React con el contrato `GameFactory` de SPEC 05. React solo monta el canvas y escucha callbacks.
- **Sí:** reutilizar `scores`, `saveScore`, `get_leaderboard` y las estadísticas existentes. Se activan con `isPlayable`.
- **No:** tabla, acción o función de ranking propias del juego.
- **Sí:** <reusar la fila `<old>` | fila nueva> en `games`. <Motivo.>
- **Sí:** jugabilidad 1:1 con el original. <O los cambios acordados, con motivo.>
- **Sí:** HUD y game over en la plataforma. <Qué queda en el canvas y por qué.>
- **No:** <sonido / ratón / atajos de depuración>. <Motivo.>
- [CONDICIONAL] **Sí:** `scoreStep` por juego en `GAME_META` y `CHECK` relajado en la BD. <El juego suma puntos no múltiplos de 10.>

---

## Riesgos

| Riesgo                                                        | Mitigación                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Strict Mode monta dos veces el motor                          | `destroy()` cancela el rAF y quita listeners; guardado ligado al id de partida. |
| <El original no es 4:3>                                       | <Layout dentro de un espacio lógico 4:3, sin deformar.>                         |
| <Assets cargados después de crear el motor>                   | <Quedarse en `ready` hasta que carguen; flag `destroyed` en los callbacks.>     |
| [CONDICIONAL] La preparación de la plataforma rompe Asteroids | Paso propio con verificación de Asteroids antes de tocar el juego nuevo.        |

---

## Lo que **no** entra en esta spec

- <Repetir la lista de fuera de alcance.>

Cada uno de estos puntos, si llega, va en su propia spec.
```

"use client";

import Link from "next/link";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import { saveScore } from "@/app/games/[id]/play/actions";
import { TouchControls } from "@/components/touch-controls";
import { useUser } from "@/components/user-provider";
import { ENGINES } from "@/lib/engines";
import { isPlayable, type PlayableGameId } from "@/lib/engines/ids";
import { GAME_META, type GameMeta, type HudStat } from "@/lib/engines/meta";
import { SKIN_IDS, SKIN_LABELS, type SkinId } from "@/lib/engines/skins";
import type { GameInstance, GamePhase, GameStats } from "@/lib/engines/types";
import type { Game } from "@/lib/games";
import type { SaveScoreResult } from "@/lib/scores";
import { readSkin, subscribeSkin, writeSkin } from "@/lib/skin-preference";
import { releaseAll, tapKey } from "@/lib/touch-input";

const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";

type SaveState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "ok" }
  | { status: "guest" }
  | { status: "empty" }
  | { status: "error"; code: "invalid" | "unknown" };

// null on the server and during hydration, so the first client render matches
function useIsTouch(): boolean | null {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(TOUCH_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(TOUCH_QUERY).matches,
    () => null,
  );
}

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

// false on the server; iPhone Safari has no Fullscreen API
function useFullscreen(): { enabled: boolean; active: boolean } {
  const enabled = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenEnabled === true,
    () => false,
  );
  const active = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null,
    () => false,
  );
  return { enabled, active };
}

// Stats before the engine emits anything: only the cells this game shows
function initialStats(meta: GameMeta): GameStats {
  return {
    score: 0,
    level: 1,
    ...(meta.initialLives !== null && { lives: meta.initialLives }),
    ...(meta.hud.includes("lines") && { lines: 0 }),
  };
}

const HUD_LABELS: Record<HudStat, string> = {
  lives: "Vidas",
  lines: "Líneas",
  level: "Nivel",
};

function hudValue(stat: HudStat, stats: GameStats): string {
  switch (stat) {
    case "lives":
      return "♥ ".repeat(stats.lives ?? 0).trim() || "—";
    case "lines":
      return (stats.lines ?? 0).toLocaleString("es-ES");
    case "level":
      return String(stats.level).padStart(2, "0");
  }
}

function SkinPicker({ gameId, skin }: { gameId: string; skin: SkinId }) {
  return (
    <span className="skin-picker" role="group" aria-label="Skin de pantalla">
      <span>MODO</span>
      <span className="skin-picker-keys">
        {SKIN_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="skin-opt"
            aria-pressed={id === skin}
            onClick={(e) => {
              writeSkin(gameId, id);
              // Keep Space for the game, not this button
              e.currentTarget.blur();
            }}
          >
            {SKIN_LABELS[id]}
          </button>
        ))}
      </span>
    </span>
  );
}

export function EnginePlayer({ game }: { game: Game }) {
  const { user } = useUser();
  const isTouch = useIsTouch();
  // null on the server and during hydration, like useIsTouch
  const skin = useSyncExternalStore(
    subscribeSkin,
    () => readSkin(game.id),
    () => null,
  );
  // The page only renders EnginePlayer when isPlayable(game.id)
  const meta = GAME_META[game.id as PlayableGameId];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen();
  const instanceRef = useRef<GameInstance | null>(null);
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [stats, setStats] = useState(() => initialStats(meta));
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const [, startTransition] = useTransition();
  // Each run has an id so a run is saved once, even with Strict Mode or a late response
  const runRef = useRef(0);
  const savedRunRef = useRef<number | null>(null);
  const scoreRef = useRef(0);

  const persist = (run: number, score: number) => {
    if (!user) return setSave({ status: "guest" });
    if (score === 0) return setSave({ status: "empty" });
    setSave({ status: "pending" });
    startTransition(async () => {
      // The request itself can fail (offline, server down): that is "unknown" too
      const result: SaveScoreResult = await saveScore({
        gameId: game.id,
        score,
      }).catch(() => ({ status: "error", code: "unknown" }));
      if (runRef.current !== run) return; // a new run already started
      if (result.status === "ok") setSave({ status: "ok" });
      else if (result.code === "unauthenticated") setSave({ status: "guest" });
      else setSave({ status: "error", code: result.code });
    });
  };

  const onStats = useEffectEvent((next: GameStats) => {
    scoreRef.current = next.score;
    setStats(next);
  });

  const onPhase = useEffectEvent((next: GamePhase) => {
    setPhase(next);
    if (next === "over" && savedRunRef.current !== runRef.current) {
      savedRunRef.current = runRef.current;
      persist(runRef.current, scoreRef.current);
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    // Wait for hydration so touch and desktop never mount twice
    if (isTouch === null || !canvas || !isPlayable(game.id)) return;
    const instance = ENGINES[game.id](
      canvas,
      {
        onStats: (s) => onStats(s),
        onPhase: (p) => onPhase(p),
      },
      { skin: readSkin(game.id) },
    );
    instanceRef.current = instance;
    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
  }, [isTouch, game.id]);

  // A gamepad key held while leaving play would stick on resume
  useEffect(() => {
    if (phase !== "playing") releaseAll();
  }, [phase]);

  useEffect(() => {
    if (!isTouch) return;
    const onVisibilityChange = () => {
      if (document.hidden) releaseAll();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [isTouch]);

  // Separate effect: changing the skin never recreates the engine
  useEffect(() => {
    if (skin) instanceRef.current?.setSkin(skin);
  }, [skin]);

  const togglePause = () => {
    if (phase === "paused") instanceRef.current?.resume();
    else instanceRef.current?.pause();
  };

  const restart = () => {
    runRef.current++;
    setSave({ status: "idle" });
    instanceRef.current?.restart();
  };

  const toggleFullscreen = () => {
    // A rejected request (no user gesture, blocked) just leaves the page as is
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else playerRef.current?.requestFullscreen().catch(() => {});
  };

  const name = user?.name ?? "INVITADO";
  const canPause = phase === "playing" || phase === "paused";

  const crt = (
    <div className="crt">
      <div className="crt-screen">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          width={800}
          height={600}
          aria-label={`${game.title}: área de juego`}
        />

        {isTouch === true && phase === "ready" && (
          <div
            className="crt-overlay tap-start"
            role="button"
            tabIndex={0}
            onClick={() => tapKey("Space")}
          >
            <div className="title">{game.title}</div>
            <div className="prompt">TOCA PARA EMPEZAR</div>
          </div>
        )}

        {isTouch === false && phase === "ready" && (
          <div className="crt-overlay">
            <div className="title">{game.title}</div>
            <dl className="controls">
              {meta.controls.map((c) => (
                <div key={c.label} style={{ display: "contents" }}>
                  <dt>
                    {c.keys.map((k) => (
                      <kbd key={k} className="keycap">
                        {k}
                      </kbd>
                    ))}
                  </dt>
                  <dd>{c.label}</dd>
                </div>
              ))}
            </dl>
            <div className="prompt">PULSA ESPACIO PARA EMPEZAR</div>
          </div>
        )}

        {phase === "paused" && (
          <div className="crt-overlay">
            <div className="title yellow">EN PAUSA</div>
            <p className="hint">
              {isTouch
                ? "PULSA REANUDAR PARA CONTINUAR"
                : "PULSA P, ESC O REANUDAR PARA CONTINUAR"}
            </p>
          </div>
        )}
      </div>
      <div className="crt-bottom">
        <span className="led">SEÑAL OK</span>
        {!isTouch && <span>{game.title} · CRT-83 · 60 HZ</span>}
        {meta.hasSkins && skin ? (
          <SkinPicker gameId={game.id} skin={skin} />
        ) : (
          <span>CARGA · 1MB</span>
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={playerRef}
      className={`av-player fade-in${isTouch ? " is-touch" : ""}`}
    >
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{stats.score.toLocaleString("es-ES")}</div>
          </div>
          {meta.hud.map((stat) => (
            <div key={stat} className={`hud-stat ${stat}`}>
              <div className="l">{HUD_LABELS[stat]}</div>
              <div className="v">{hudValue(stat, stats)}</div>
            </div>
          ))}
        </div>
        <div className="hud-actions">
          <button
            className="btn yellow"
            onClick={togglePause}
            disabled={!canPause}
          >
            {phase === "paused" ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            className="btn magenta"
            onClick={() => instanceRef.current?.end()}
            disabled={phase === "over"}
          >
            FIN
          </button>
          {isTouch === true && fullscreen.enabled && (
            <button className="btn ghost" onClick={toggleFullscreen}>
              {fullscreen.active
                ? "SALIR PANTALLA COMPLETA"
                : "PANTALLA COMPLETA"}
            </button>
          )}
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      {isTouch ? (
        <div className="touch-stage">
          {crt}
          <TouchControls layout={meta.touch} />
        </div>
      ) : (
        crt
      )}

      {phase === "over" && (
        <div className="modal-bd">
          <div
            className="modal"
            role="dialog"
            aria-labelledby="game-over-title"
          >
            <h2 id="game-over-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{stats.score.toLocaleString("es-ES")}</div>
            {meta.hud.includes("level") && (
              <div className="final-level">
                NIVEL {String(stats.level).padStart(2, "0")}
              </div>
            )}
            {meta.hud.includes("lines") && (
              <div className="final-level lines">
                LÍNEAS {(stats.lines ?? 0).toLocaleString("es-ES")}
              </div>
            )}
            <SaveStatus
              save={save}
              onRetry={() => persist(runRef.current, scoreRef.current)}
            />
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveStatus({
  save,
  onRetry,
}: {
  save: SaveState;
  onRetry: () => void;
}) {
  switch (save.status) {
    case "idle":
      return null;
    case "pending":
      return (
        <div className="save-status pending" role="status">
          ▸ GUARDANDO<span className="caret">…</span>
        </div>
      );
    case "ok":
      return (
        <div className="toast-saved" role="status">
          ▸ PUNTUACIÓN GUARDADA_
        </div>
      );
    case "empty":
      return <div className="save-status">▸ SIN PUNTOS QUE GUARDAR</div>;
    case "guest":
      return (
        <div className="save-status">
          ▸ INICIA SESIÓN PARA GUARDAR TUS PUNTUACIONES
          <div>
            <Link href="/login" className="btn yellow">
              INICIAR SESIÓN
            </Link>
          </div>
        </div>
      );
    case "error":
      return save.code === "invalid" ? (
        <div className="save-status error" role="alert">
          &gt; PUNTUACIÓN NO VÁLIDA.
        </div>
      ) : (
        <div className="save-status error" role="alert">
          &gt; ERROR AL GUARDAR.
          <div>
            <button className="btn yellow" onClick={onRetry}>
              REINTENTAR
            </button>
          </div>
        </div>
      );
  }
}

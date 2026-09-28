"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@/components/user-provider";
import type { Game } from "@/lib/games";
import { saveScore } from "@/lib/scores";

const INITIAL_RUN = { score: 0, lives: 3, level: 1 };

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useUser();
  // score and level live together so the level-up is computed in the same update
  const [run, setRun] = useState(INITIAL_RUN);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  // null = not edited yet, so the name follows the session once it is read
  const [editedName, setEditedName] = useState<string | null>(null);
  const name = editedName ?? user?.name ?? "INVITADO";

  // Fake gameplay: score climbs by itself until paused or finished
  useEffect(() => {
    if (over || paused) return;
    const t = setInterval(() => {
      const gain = Math.floor(10 + Math.random() * 90);
      setRun((r) => {
        const score = r.score + gain;
        return { ...r, score, level: score % 2500 < 100 ? r.level + 1 : r.level };
      });
    }, 220);
    return () => clearInterval(t);
  }, [over, paused]);

  const restart = () => {
    setRun(INITIAL_RUN);
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  const save = () => {
    saveScore({ game: game.id, score: run.score, name });
    setSaved(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>{name}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{run.score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(run.lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(run.level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>{paused ? "REANUDAR" : "PAUSA"}</button>
          <button className="btn magenta" onClick={() => setOver(true)}>FIN</button>
          <Link href={`/games/${game.id}`} className="btn ghost">SALIR</Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <div className="game-arena">
            <div className="grid-floor"></div>
            <div className="enemy e1"></div>
            <div className="enemy e2"></div>
            <div className="enemy e3"></div>
            <div className="player-ship"></div>
          </div>
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>EN PAUSA</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}>
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{run.score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setEditedName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={save}>GUARDAR PUNTUACIÓN</button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>JUGAR DE NUEVO</button>
              <Link href="/" className="btn magenta">VOLVER AL VAULT</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

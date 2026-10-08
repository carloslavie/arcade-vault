"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GameCard } from "@/components/game-card";
import { CATS, type Game, type GameStats } from "@/lib/games";

export function Library({
  games,
  stats,
}: {
  games: Game[];
  stats: Record<string, GameStats> | null;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("TODOS");

  // TODOS + categories with at least one game, in CATS order
  const cats = useMemo(
    () => CATS.filter((c) => c === "TODOS" || games.some((g) => g.cat === c)),
    [games],
  );

  const filtered = useMemo(
    () =>
      games.filter(
        (g) =>
          (cat === "TODOS" || g.cat === cat) &&
          g.title.toLowerCase().includes(q.toLowerCase()),
      ),
    [games, q, cat],
  );

  // No playable game at all: nothing to search or filter
  if (games.length === 0) {
    return (
      <div className="av-coming">
        <div className="av-coming-slots" aria-hidden="true">
          <div />
          <div />
          <div />
        </div>
        <div className="av-coming-msg">▸ PRÓXIMAMENTE MÁS JUEGOS</div>
        <div className="av-coming-hint">
          Estamos preparando la próxima máquina. Vuelve pronto.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="av-filters">
        <div className="av-search">
          <span className="ico">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un juego por nombre…"
          />
        </div>
        <div className="av-chips">
          {cats.map((c) => (
            <button
              key={c}
              className={"chip" + (cat === c ? " active" : "")}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="av-grid">
        {filtered.map((g) => (
          <GameCard
            key={g.id}
            game={g}
            best={stats?.[g.id]?.best}
            onSelect={(game) => router.push(`/games/${game.id}`)}
          />
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: 80,
              color: "var(--ink-faint)",
            }}
          >
            <div
              className="pixel"
              style={{
                fontSize: 14,
                color: "var(--magenta)",
                marginBottom: 12,
              }}
            >
              NO HAY RESULTADOS
            </div>
            <div>Intenta otra búsqueda o categoría.</div>
          </div>
        )}
      </div>
    </>
  );
}

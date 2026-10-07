import type { ScoreRow } from "@/lib/games";

const TOP = ["top1", "top2", "top3"];
// Empty cabinet slots shown while nobody has scored yet
const GHOST_SLOTS = 3;

export function Leaderboard({ rows }: { rows: ScoreRow[] | null }) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>

      {rows === null && (
        <div className="lb-status error" role="alert">
          {"> ERROR AL CARGAR EL RANKING."}
          <span className="hint">RECARGA LA PÁGINA PARA REINTENTAR.</span>
        </div>
      )}

      {rows?.length === 0 && (
        <>
          {Array.from({ length: GHOST_SLOTS }, (_, i) => (
            <div key={i} className="lb-row ghost" aria-hidden="true">
              <div className="rk">#{String(i + 1).padStart(2, "0")}</div>
              <div className="pl">------</div>
              <div className="sc">000000</div>
            </div>
          ))}
          <div className="lb-status">▸ AÚN NO HAY PUNTUACIONES</div>
        </>
      )}

      {rows?.map((r, i) => (
        <div key={r.name} className={"lb-row" + (TOP[i] ? " " + TOP[i] : "")}>
          <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
          <div className="pl">
            {r.name}
            <div
              style={{
                fontSize: 10,
                color: "var(--ink-faint)",
                letterSpacing: "0.1em",
              }}
            >
              {r.date}
            </div>
          </div>
          <div className="sc">{r.score.toLocaleString("es-ES")}</div>
        </div>
      ))}
    </div>
  );
}

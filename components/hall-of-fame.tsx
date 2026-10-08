import Link from "next/link";
import type { Game, ScoreRow } from "@/lib/games";

const TOP = ["top1", "top2", "top3"];

export type HallOfFameYou = {
  name: string;
  best: ScoreRow | null; // null = no score in this game yet
};

function rankLabel(rank: number) {
  return "#" + String(rank).padStart(2, "0");
}

// Podium slot for rows[index]; an empty cabinet slot while nobody holds that place
function PodiumSlot({
  row,
  place,
  medal,
}: {
  row: ScoreRow | undefined;
  place: number;
  medal: "gold" | "silver" | "bronze";
}) {
  const gold = medal === "gold";
  return (
    <div
      className={"podium-slot " + medal + (row ? "" : " ghost")}
      aria-hidden={row ? undefined : true}
    >
      {gold && (
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--gold)",
            letterSpacing: "0.18em",
          }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={gold ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {String(place).padStart(2, "0")}
      </div>
      <div className="name">{row?.name ?? "------"}</div>
      <div className="score" style={gold ? { fontSize: 20 } : undefined}>
        {row ? row.score.toLocaleString("es-ES") : "000000"}
      </div>
      <div className="date">{row?.date ?? "--/--/----"}</div>
    </div>
  );
}

export function HallOfFame({
  games,
  active,
  rows,
  you,
}: {
  games: Game[]; // playable games only
  active: Game | undefined; // undefined = no playable game
  rows: ScoreRow[] | null; // null = the ranking failed to load
  you: HallOfFameYou | undefined; // undefined = guest or error: no "your best" row
}) {
  const head = (
    <div className="hall-head">
      <h1>SALÓN DE LA FAMA</h1>
      <p className="pixel" style={{ fontSize: 10 }}>
        LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
      </p>
    </div>
  );

  const back = (
    <div style={{ textAlign: "center", marginTop: 32 }}>
      <Link href="/games" className="btn lg">
        VOLVER A LA BIBLIOTECA
      </Link>
    </div>
  );

  if (!active) {
    return (
      <div className="av-hall fade-in">
        {head}
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
        {back}
      </div>
    );
  }

  const best = you?.best ?? null;
  // The player's row is already in the table: highlight it instead of repeating it below
  const youInTable = best !== null && !!rows?.some((r) => r.rank === best.rank);

  return (
    <div className="av-hall fade-in">
      {head}

      <div className="hall-tabs">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/hall-of-fame?game=${g.id}`}
            scroll={false}
            className={"chip" + (g.id === active.id ? " active" : "")}
            aria-current={g.id === active.id ? "page" : undefined}
          >
            {g.title}
          </Link>
        ))}
      </div>

      <div className="podium">
        <PodiumSlot row={rows?.[1]} place={2} medal="silver" />
        <PodiumSlot row={rows?.[0]} place={1} medal="gold" />
        <PodiumSlot row={rows?.[2]} place={3} medal="bronze" />
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>

        {rows === null && (
          <div className="tr status error" role="alert">
            {"> ERROR AL CARGAR EL RANKING."}
            <span className="hint">RECARGA LA PÁGINA PARA REINTENTAR.</span>
          </div>
        )}

        {rows?.length === 0 && (
          <div className="tr status">▸ AÚN NO HAY PUNTUACIONES</div>
        )}

        {rows?.map((r, i) => {
          const isYou = youInTable && r.rank === best!.rank;
          return (
            <div
              key={r.rank}
              className={
                "tr" + (TOP[i] ? " " + TOP[i] : "") + (isYou ? " you" : "")
              }
              style={{ animationDelay: `${i * 50}ms` }}
              aria-current={isYou ? "true" : undefined}
            >
              <div className="rk">{rankLabel(r.rank)}</div>
              <div className="pl">{r.name}</div>
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
              <div className="dt">{r.date}</div>
            </div>
          );
        })}

        {you && !youInTable && (
          <>
            <div className="tr you-label">
              ▸ TU MEJOR MARCA EN {active.title}
            </div>
            {best ? (
              <div
                className="tr you"
                style={{ animationDelay: `${(rows?.length ?? 0) * 50 + 50}ms` }}
              >
                <div className="rk" style={{ color: "var(--yellow)" }}>
                  {rankLabel(best.rank)}
                </div>
                <div className="pl" style={{ color: "var(--yellow)" }}>
                  {best.name}
                </div>
                <div
                  className="sc"
                  style={{
                    color: "var(--yellow)",
                    textShadow: "0 0 6px rgba(245,255,0,0.5)",
                  }}
                >
                  {best.score.toLocaleString("es-ES")}
                </div>
                <div className="dt">{best.date}</div>
              </div>
            ) : (
              <div className="tr status you-none">
                ▸ AÚN NO TIENES MARCA EN {active.title}
              </div>
            )}
          </>
        )}
      </div>

      {back}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Leaderboard } from "@/components/leaderboard";
import { getGame } from "@/lib/catalog";
import { mockStats } from "@/lib/games";
import { getLeaderboard } from "@/lib/leaderboard";

export async function generateMetadata({
  params,
}: PageProps<"/games/[id]">): Promise<Metadata> {
  const game = await getGame((await params).id);
  return game ? { title: game.title, description: game.short } : {};
}

export default async function GameDetailPage({
  params,
}: PageProps<"/games/[id]">) {
  const { id } = await params;
  // getLeaderboard never throws: a failure renders the error state inside the panel
  const [game, scores] = await Promise.all([getGame(id), getLeaderboard(id)]);
  if (!game) notFound();
  const stats = mockStats(game.id);

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{stats.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: "var(--magenta)",
                  textShadow: "0 0 6px rgba(255,0,110,0.5)",
                }}
              >
                {stats.best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/games/${game.id}/play`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/games" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <Leaderboard rows={scores} />
      </aside>
    </div>
  );
}

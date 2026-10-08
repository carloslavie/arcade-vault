import type { Metadata } from "next";
import { Library } from "@/components/library";
import { getGames } from "@/lib/catalog";
import { isPlayable } from "@/lib/engines/ids";
import { getAllGameStats } from "@/lib/game-stats";

export const metadata: Metadata = { title: "Biblioteca" };

export default async function GamesPage() {
  // getAllGameStats never throws: a failure shows "—" on every card
  const [games, stats] = await Promise.all([getGames(), getAllGameStats()]);
  // Only games with an engine; the rest stay in public.games for when theirs lands
  const playable = games.filter((g) => isPlayable(g.id));

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>
      <Library games={playable} stats={stats} />
    </div>
  );
}

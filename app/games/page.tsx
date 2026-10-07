import type { Metadata } from "next";
import { Library } from "@/components/library";
import { getGames } from "@/lib/catalog";

export const metadata: Metadata = { title: "Biblioteca" };

export default async function GamesPage() {
  const games = await getGames();

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>
      <Library games={games} />
    </div>
  );
}

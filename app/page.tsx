import { Landing } from "@/components/landing";
import { RevealObserver } from "@/components/reveal-observer";
import { getGames } from "@/lib/catalog";

export default async function Home() {
  const games = await getGames();

  return (
    <>
      <Landing games={games} />
      <RevealObserver />
    </>
  );
}

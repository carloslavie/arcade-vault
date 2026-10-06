import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnginePlayer } from "@/components/engine-player";
import { GamePlayer } from "@/components/game-player";
import { isPlayable } from "@/lib/engines/ids";
import { GAMES, getGame } from "@/lib/games";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: PageProps<"/games/[id]/play">): Promise<Metadata> {
  const game = getGame((await params).id);
  return game ? { title: `Jugando ${game.title}` } : {};
}

export default async function GamePlayPage({ params }: PageProps<"/games/[id]/play">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  // Real engine when the game has one; the fake player otherwise
  return isPlayable(id) ? <EnginePlayer game={game} /> : <GamePlayer game={game} />;
}

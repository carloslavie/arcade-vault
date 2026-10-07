import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnginePlayer } from "@/components/engine-player";
import { GamePlayer } from "@/components/game-player";
import { getGame } from "@/lib/catalog";
import { isPlayable } from "@/lib/engines/ids";

export async function generateMetadata({
  params,
}: PageProps<"/games/[id]/play">): Promise<Metadata> {
  const game = await getGame((await params).id);
  return game ? { title: `Jugando ${game.title}` } : {};
}

export default async function GamePlayPage({
  params,
}: PageProps<"/games/[id]/play">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  // Real engine when the game has one; the fake player otherwise
  return isPlayable(id) ? (
    <EnginePlayer game={game} />
  ) : (
    <GamePlayer game={game} />
  );
}

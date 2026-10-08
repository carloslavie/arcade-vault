import type { Metadata } from "next";
import { HallOfFame, type HallOfFameYou } from "@/components/hall-of-fame";
import { getGames } from "@/lib/catalog";
import { isPlayable } from "@/lib/engines/ids";
import {
  getLeaderboard,
  getPlayerBest,
  HALL_OF_FAME_SIZE,
} from "@/lib/leaderboard";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Salón de la Fama" };

export default async function HallOfFamePage({
  searchParams,
}: PageProps<"/hall-of-fame">) {
  const { game } = await searchParams;
  const games = (await getGames()).filter((g) => isPlayable(g.id));
  // Missing, repeated (?game=a&game=b) or non-playable id: fall back to the first playable game
  const active =
    (typeof game === "string" && games.find((g) => g.id === game)) || games[0];

  if (!active) {
    return (
      <HallOfFame
        games={games}
        active={undefined}
        rows={null}
        you={undefined}
      />
    );
  }

  // getLeaderboard and getPlayerBest never throw: a failure renders the error state or hides the row
  const [rows, user] = await Promise.all([
    getLeaderboard(active.id, HALL_OF_FAME_SIZE),
    getCurrentUser(),
  ]);

  let you: HallOfFameYou | undefined;
  if (user && rows) {
    const best = await getPlayerBest(active.id, user.id);
    if (best) you = { name: user.name, best: best.row };
  }

  return <HallOfFame games={games} active={active} rows={rows} you={you} />;
}

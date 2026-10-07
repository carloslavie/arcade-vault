import { unstable_rethrow } from "next/navigation";

import type { ScoreRow } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

export const LEADERBOARD_SIZE = 10;

// dd/mm/aaaa in UTC, so the date doesn't depend on the server's time zone
const DATE_FORMAT = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

// Best score per player. null if Supabase fails (logged); [] if there are no scores.
export async function getLeaderboard(
  gameId: string,
): Promise<ScoreRow[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_leaderboard", {
      p_game_id: gameId,
      p_limit: LEADERBOARD_SIZE,
    });
    if (error) throw error;

    return data.map((r) => ({
      rank: r.rank,
      name: r.username,
      score: r.score,
      date: DATE_FORMAT.format(new Date(r.created_at)),
    }));
  } catch (error) {
    // Let Next.js internal errors through (e.g. the dynamic-rendering bailout from cookies())
    unstable_rethrow(error);
    console.error("getLeaderboard failed:", error);
    return null;
  }
}

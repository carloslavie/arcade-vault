import { unstable_rethrow } from "next/navigation";

import type { ScoreRow } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

export const LEADERBOARD_SIZE = 10;
export const HALL_OF_FAME_SIZE = 20;

// dd/mm/aaaa in UTC, so the date doesn't depend on the server's time zone
const DATE_FORMAT = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

type RankedRow = {
  rank: number;
  username: string;
  score: number;
  created_at: string;
};

function toScoreRow(r: RankedRow): ScoreRow {
  return {
    rank: r.rank,
    name: r.username,
    score: r.score,
    date: DATE_FORMAT.format(new Date(r.created_at)),
  };
}

// Best score per player. null if Supabase fails (logged); [] if there are no scores.
export async function getLeaderboard(
  gameId: string,
  limit = LEADERBOARD_SIZE,
): Promise<ScoreRow[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_leaderboard", {
      p_game_id: gameId,
      p_limit: limit,
    });
    if (error) throw error;

    return data.map(toScoreRow);
  } catch (error) {
    // Let Next.js internal errors through (e.g. the dynamic-rendering bailout from cookies())
    unstable_rethrow(error);
    console.error("getLeaderboard failed:", error);
    return null;
  }
}

// A player's best score and rank. null if Supabase fails (logged);
// { row: null } if the player has no score in that game.
export async function getPlayerBest(
  gameId: string,
  userId: string,
): Promise<{ row: ScoreRow | null } | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_player_best", {
      p_game_id: gameId,
      p_user_id: userId,
    });
    if (error) throw error;

    return { row: data[0] ? toScoreRow(data[0]) : null };
  } catch (error) {
    unstable_rethrow(error);
    console.error("getPlayerBest failed:", error);
    return null;
  }
}

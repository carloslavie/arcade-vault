import { unstable_rethrow } from "next/navigation";

import type { GameStats } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

type StatsRow = { game_id: string; plays: number; best: number | null };

// The generated types declare best as number, but max() over no rows is null
async function fetchStats(gameId?: string): Promise<StatsRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_game_stats",
    gameId ? { p_game_id: gameId } : {},
  );
  if (error) throw error;
  return data as StatsRow[];
}

function toStats(row: StatsRow): GameStats {
  return { plays: Number(row.plays), best: row.best ?? null };
}

// By game id. null if Supabase fails (logged).
export async function getAllGameStats(): Promise<Record<
  string,
  GameStats
> | null> {
  try {
    const rows = await fetchStats();
    return Object.fromEntries(rows.map((r) => [r.game_id, toStats(r)]));
  } catch (error) {
    // Let Next.js internal errors through (e.g. the dynamic-rendering bailout from cookies())
    unstable_rethrow(error);
    console.error("getAllGameStats failed:", error);
    return null;
  }
}

// null if Supabase fails (logged) or the game doesn't exist.
export async function getGameStats(gameId: string): Promise<GameStats | null> {
  try {
    const [row] = await fetchStats(gameId);
    return row ? toStats(row) : null;
  } catch (error) {
    unstable_rethrow(error);
    console.error("getGameStats failed:", error);
    return null;
  }
}

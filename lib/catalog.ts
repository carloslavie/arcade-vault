import { cache } from "react";

import type { Category, Game, NeonColor } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type GameRow = Database["public"]["Tables"]["games"]["Row"];

const COLUMNS = "id, title, short, long, cat, cover, color, difficulty";

// The CHECKs on public.games guarantee cat and color hold valid values
function toGame(
  row: Pick<
    GameRow,
    "id" | "title" | "short" | "long" | "cat" | "cover" | "color" | "difficulty"
  >,
): Game {
  return {
    id: row.id,
    title: row.title,
    short: row.short,
    long: row.long,
    cat: row.cat as Category,
    cover: row.cover,
    color: row.color as NeonColor,
    difficulty: row.difficulty,
  };
}

// Ordered by sort_order. Throws if Supabase fails (caught by app/error.tsx).
export const getGames = cache(async (): Promise<Game[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(COLUMNS)
    .order("sort_order");
  if (error) throw new Error(`getGames failed: ${error.message}`);
  return data.map(toGame);
});

// null if the game doesn't exist (→ notFound()); throws if Supabase fails.
export const getGame = cache(async (id: string): Promise<Game | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getGame failed: ${error.message}`);
  return data ? toGame(data) : null;
});

"use server";

import {
  validateScore,
  type SaveScoreInput,
  type SaveScoreResult,
} from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";

function unknownError(error: unknown): SaveScoreResult {
  const detail =
    error instanceof Error ? `${error.name}: ${error.message}` : error;
  console.error("[scores] saveScore failed:", detail);
  return { status: "error", code: "unknown" };
}

// Reachable by direct POST, so the input is untrusted and user_id always comes from the session
export async function saveScore(
  input: SaveScoreInput,
): Promise<SaveScoreResult> {
  const valid =
    input && typeof input === "object" ? validateScore(input) : null;
  if (!valid) return { status: "error", code: "invalid" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "error", code: "unauthenticated" };

    const { error } = await supabase
      .from("scores")
      .insert({ user_id: user.id, game_id: valid.gameId, score: valid.score });
    if (error) return unknownError(error);
  } catch (error) {
    return unknownError(error);
  }

  return { status: "ok" };
}

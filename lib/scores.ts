import { isPlayable } from "@/lib/engines/ids";
import { GAME_META } from "@/lib/engines/meta";

// Same bounds as the CHECK on public.scores; the step depends on the game (GAME_META)
export const SCORE_LIMITS = { min: 1, max: 10_000_000 } as const;

export interface SaveScoreInput {
  gameId: string;
  score: number;
}

export type SaveScoreErrorCode = "unauthenticated" | "invalid" | "unknown";

export type SaveScoreResult =
  { status: "ok" } | { status: "error"; code: SaveScoreErrorCode };

// null if gameId is not playable or score is not an integer, multiple of the game's step and within limits
export function validateScore(input: SaveScoreInput): SaveScoreInput | null {
  const { gameId, score } = input;
  if (typeof gameId !== "string" || !isPlayable(gameId)) return null;
  if (
    !Number.isInteger(score) ||
    score < SCORE_LIMITS.min ||
    score > SCORE_LIMITS.max ||
    score % GAME_META[gameId].scoreStep !== 0
  )
    return null;
  return { gameId, score };
}

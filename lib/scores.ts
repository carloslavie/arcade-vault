import { isPlayable } from "@/lib/engines/ids";

// Same bounds as the CHECK on public.scores
export const SCORE_LIMITS = { min: 1, max: 10_000_000, step: 10 } as const;

export interface SaveScoreInput {
  gameId: string;
  score: number;
}

export type SaveScoreErrorCode = "unauthenticated" | "invalid" | "unknown";

export type SaveScoreResult =
  { status: "ok" } | { status: "error"; code: SaveScoreErrorCode };

// null if gameId is not playable or score is not an integer, multiple of 10 and within limits
export function validateScore(input: SaveScoreInput): SaveScoreInput | null {
  const { gameId, score } = input;
  if (typeof gameId !== "string" || !isPlayable(gameId)) return null;
  if (
    !Number.isInteger(score) ||
    score < SCORE_LIMITS.min ||
    score > SCORE_LIMITS.max ||
    score % SCORE_LIMITS.step !== 0
  )
    return null;
  return { gameId, score };
}

// Client-only registry: the Record type keeps it in sync with PLAYABLE_GAME_IDS
import { createAsteroidsGame } from "@/lib/engines/asteroids/engine";
import type { PlayableGameId } from "@/lib/engines/ids";
import type { GameFactory } from "@/lib/engines/types";

export const ENGINES: Record<PlayableGameId, GameFactory> = {
  asteroids: createAsteroidsGame,
};

// Client-only registry: the Record type keeps it in sync with PLAYABLE_GAME_IDS
import { createArkanoidGame } from "@/lib/engines/arkanoid/engine";
import { createAsteroidsGame } from "@/lib/engines/asteroids/engine";
import { createTetrisGame } from "@/lib/engines/tetris/engine";
import type { PlayableGameId } from "@/lib/engines/ids";
import type { GameFactory } from "@/lib/engines/types";

export const ENGINES: Record<PlayableGameId, GameFactory> = {
  asteroids: createAsteroidsGame,
  tetris: createTetrisGame,
  arkanoid: createArkanoidGame,
};

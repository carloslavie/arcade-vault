// Games with a real engine. No browser code here, so the server can import it.
export const PLAYABLE_GAME_IDS = ["asteroids", "tetris", "arkanoid"] as const;

export type PlayableGameId = (typeof PLAYABLE_GAME_IDS)[number];

export function isPlayable(id: string): id is PlayableGameId {
  return (PLAYABLE_GAME_IDS as readonly string[]).includes(id);
}

// Catalog types shared by client and server. The catalog itself lives in public.games (see lib/catalog.ts);
// what remains here is mock data, ported from references/templates/data.jsx

export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: NeonColor;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export interface GameMockStats {
  best: number;
  plays: string;
}

// Values from the old GAMES array, until there are real stats
export const GAME_MOCK_STATS: Record<string, GameMockStats> = {
  "bloque-buster": { best: 28450, plays: "12.4K" },
  caida: { best: 184220, plays: "31.8K" },
  serpentina: { best: 7820, plays: "9.1K" },
  gloton: { best: 96400, plays: "27.2K" },
  invasores: { best: 54190, plays: "18.0K" },
  rocas: { best: 41200, plays: "15.6K" },
  ranaria: { best: 18900, plays: "6.4K" },
  "duelo-pixel": { best: 24, plays: "4.2K" },
};

export function mockStats(id: string): GameMockStats {
  return GAME_MOCK_STATS[id] ?? { best: 0, plays: "0" };
}

export const CATS: ("TODOS" | Category)[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];

const PLAYERS = [
  "PX_KAI",
  "NEONFOX",
  "Z3R0COOL",
  "M00NRYU",
  "VAULT_07",
  "GLITCHA",
  "ATARI_KID",
  "CYBER_LU",
  "MAGENTA88",
  "SCANLINE",
  "BIT_LORD",
  "ARKADYA",
  "DROID_X",
  "RGB_QUEEN",
  "PIXEL_DAD",
  "RETROVIRA",
  "VECTORX",
  "JOY_STK",
];

// Deterministic, so server and client render the same rows
export function seededScores(seed: number, count = 12): ScoreRow[] {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const used = new Set<string>();
  const rows: ScoreRow[] = [];
  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      name = PLAYERS[Math.floor(rand() * PLAYERS.length)];
    } while (used.has(name) && used.size < PLAYERS.length);
    used.add(name);
    const base = Math.floor(50000 + rand() * 250000);
    const score = base - i * Math.floor(2000 + rand() * 4000);
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
    const mon = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
    rows.push({
      rank: i + 1,
      name,
      score: Math.max(score, 1000),
      date: `${day}/${mon}/2026`,
    });
  }
  return rows
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

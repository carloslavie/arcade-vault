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
  difficulty: number; // 1–5
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export interface GameStats {
  plays: number;
  best: number | null; // null = nobody has scored yet
}

const EMPTY_STAT = "—";

// es-ES skips grouping on 4-digit numbers by default ("9870"), so force it
const PLAYS_EXACT = new Intl.NumberFormat("es-ES", { useGrouping: "always" });
const PLAYS_COMPACT = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1,
});

// One decimal, truncated so it never shows more plays than there are
function compact(n: number, unit: number, suffix: string): string {
  return PLAYS_COMPACT.format(Math.floor((n * 10) / unit) / 10) + suffix;
}

// < 10.000 → exact ("9.870"); < 1.000.000 → "15,6K"; rest → "1,2M". null → "—".
export function formatPlays(plays: number | null | undefined): string {
  if (plays == null) return EMPTY_STAT;
  if (plays < 10_000) return PLAYS_EXACT.format(plays);
  if (plays < 1_000_000) return compact(plays, 1_000, "K");
  return compact(plays, 1_000_000, "M");
}

// es-ES ("41.200"); null/undefined → "—".
export function formatBest(best: number | null | undefined): string {
  return best == null ? EMPTY_STAT : best.toLocaleString("es-ES");
}

// 4 → "★ ★ ★ ★ ☆"
export function difficultyStars(difficulty: number): string {
  return Array.from({ length: 5 }, (_, i) => (i < difficulty ? "★" : "☆")).join(
    " ",
  );
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

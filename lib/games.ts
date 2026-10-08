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

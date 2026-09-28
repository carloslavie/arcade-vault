const SCORES_KEY = "av_scores";

export type SavedScore = { game: string; score: number; name: string; at: number };

// Appends a score to localStorage. Nothing reads it yet (see SPEC 01).
export function saveScore(entry: Omit<SavedScore, "at">) {
  try {
    const all = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]") as SavedScore[];
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {}
}

// Touch gamepad → synthetic keyboard events on window, so engines need no changes.
// Client-only, no React.
import type { TouchKeyCode } from "@/lib/engines/meta";

export const REPEAT_DELAY_MS = 170;
export const REPEAT_INTERVAL_MS = 50;

// count: buttons holding this code; timer: pending autorepeat (timeout, then interval)
const held = new Map<TouchKeyCode, { count: number; timer: number | null }>();

function dispatch(
  type: "keydown" | "keyup",
  code: TouchKeyCode,
  repeat = false,
) {
  window.dispatchEvent(
    new KeyboardEvent(type, { code, repeat, bubbles: true, cancelable: true }),
  );
}

function stopRepeat(entry: { timer: number | null }) {
  // clearTimeout also clears intervals: both share the same id pool
  if (entry.timer !== null) window.clearTimeout(entry.timer);
  entry.timer = null;
}

export function pressKey(code: TouchKeyCode, opts?: { repeat?: boolean }) {
  const entry = held.get(code);
  if (entry) {
    entry.count++;
    return;
  }
  const next = { count: 1, timer: null as number | null };
  held.set(code, next);
  dispatch("keydown", code);
  if (!opts?.repeat) return;
  next.timer = window.setTimeout(() => {
    dispatch("keydown", code, true);
    next.timer = window.setInterval(
      () => dispatch("keydown", code, true),
      REPEAT_INTERVAL_MS,
    );
  }, REPEAT_DELAY_MS);
}

export function releaseKey(code: TouchKeyCode) {
  const entry = held.get(code);
  if (!entry) return;
  if (--entry.count > 0) return;
  stopRepeat(entry);
  held.delete(code);
  dispatch("keyup", code);
}

export function releaseAll() {
  for (const [code, entry] of held) {
    stopRepeat(entry);
    dispatch("keyup", code);
  }
  held.clear();
}

export function tapKey(code: TouchKeyCode) {
  dispatch("keydown", code);
  dispatch("keyup", code);
}

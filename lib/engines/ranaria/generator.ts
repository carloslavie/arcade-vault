// Endless world generator for Ranaria (SPEC 19): pure, seeded by the injected rng.
// Rows are numbered upwards from 0; each call to next() returns the following row.

export const CELL = 40; // px per grid cell
export const FIELD_COLS = 19;
export const SHORE_EVERY = 25; // rows 25, 50, 75… are lily-pad shores
export const SAFE_START_ROWS = 4; // rows 0–3 are grass
export const SPEED_STEP = 0.1; // speed multiplier gained per level
export const MAX_SPEED_MUL = 2; // reached at level 11

export type RowKind = "grass" | "road" | "river" | "shore";

export interface Lane {
  kind: "car" | "truck" | "log" | "turtle";
  len: number; // cells per object (turtles: per group)
  gap: number; // empty cells between objects
  count: number; // objects in the cyclic pattern
  dir: 1 | -1; // 1 = moves right
  speed: number; // px/s, already scaled by the level
  offset: number; // initial px shift of the pattern
  divers: number[]; // indices of turtle groups that dive
  tint: 0 | 1 | 2; // car color slot of the skin (car1–car3)
}

export interface Row {
  index: number;
  kind: RowKind;
  lane?: Lane;
}

export type Rng = () => number;

export function speedMul(level: number) {
  return Math.min(MAX_SPEED_MUL, 1 + SPEED_STEP * (level - 1));
}

function randInt(rng: Rng, min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1));
}

function randRange(rng: Rng, min: number, max: number) {
  return min + rng() * (max - min);
}

function makeLane(
  kind: "road" | "river",
  dir: 1 | -1,
  level: number,
  rng: Rng,
): Lane {
  let lane: Pick<Lane, "kind" | "len" | "gap" | "speed">;
  if (kind === "road") {
    lane =
      rng() < 0.7
        ? { kind: "car", len: 1, gap: 0, speed: randRange(rng, 60, 110) }
        : { kind: "truck", len: 2, gap: 0, speed: randRange(rng, 40, 70) };
    lane.gap = randInt(rng, 3, 6);
  } else {
    lane =
      rng() < 0.6
        ? {
            kind: "log",
            len: randInt(rng, 3, 5),
            gap: 0,
            speed: randRange(rng, 40, 80),
          }
        : {
            kind: "turtle",
            len: randInt(rng, 2, 3),
            gap: 0,
            speed: randRange(rng, 50, 80),
          };
    lane.gap = randInt(rng, 2, 3);
  }
  // Pattern long enough that an object always leaves the field before it wraps
  const count = Math.ceil((FIELD_COLS + lane.len) / (lane.len + lane.gap));
  const period = count * (lane.len + lane.gap) * CELL;
  const divers: number[] = [];
  if (lane.kind === "turtle" && level >= 3)
    for (let i = 0; i < count; i += 3) divers.push(i);
  return {
    ...lane,
    count,
    dir,
    speed: lane.speed * speedMul(level),
    offset: rng() * period,
    divers,
    tint: lane.kind === "car" ? (randInt(rng, 0, 2) as 0 | 1 | 2) : 0,
  };
}

// Stateful per run (not global): remembers the segment it is laying out
export function createRowGenerator(rng: Rng) {
  let index = 0;
  let segKind: "road" | "river" = "road";
  let lanesLeft = 0;
  let grassLeft = 0;
  let dir: 1 | -1 = 1;

  const grass = (i: number): Row => ({ index: i, kind: "grass" });

  function next(level: number): Row {
    const r = index++;
    if (r < SAFE_START_ROWS) return grass(r);
    if (r % SHORE_EVERY === 0) return { index: r, kind: "shore" };
    // Grass right before and after every shore; it also trims the segment
    if ((r + 1) % SHORE_EVERY === 0 || (r - 1) % SHORE_EVERY === 0) {
      lanesLeft = 0;
      grassLeft = 0;
      return grass(r);
    }
    if (lanesLeft === 0) {
      if (grassLeft > 0) {
        grassLeft--;
        return grass(r);
      }
      // New segment after a grass strip
      segKind = rng() < 0.55 ? "road" : "river";
      lanesLeft = randInt(rng, 1, Math.min(5, 2 + level));
      dir = rng() < 0.5 ? 1 : -1;
    } else {
      dir = dir === 1 ? -1 : 1; // lanes of a segment alternate
    }
    lanesLeft--;
    if (lanesLeft === 0) grassLeft = rng() < 0.5 ? 1 : 2;
    return {
      index: r,
      kind: segKind,
      lane: makeLane(segKind, dir, level, rng),
    };
  }

  return { next };
}

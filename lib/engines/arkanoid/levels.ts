// The 5 levels ported 1:1 from references/started-games/04-arkanoid/levels.js

export type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

export interface LevelBlock {
  col: number;
  row: number;
  color: BlockColor;
}

export interface Level {
  speed: number; // multiplies the base ball velocity
  blocks: LevelBlock[];
}

const ROWS = 6;
const COLS = 10;

function grid(pick: (col: number, row: number) => BlockColor | null) {
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++) {
      const color = pick(col, row);
      if (color) blocks.push({ col, row, color });
    }
  return blocks;
}

const rowColors1: BlockColor[] = [
  "red",
  "yellow",
  "cyan",
  "magenta",
  "hotpink",
  "green",
];
const rowColors2: BlockColor[] = [
  "gray",
  "cyan",
  "hotpink",
  "yellow",
  "magenta",
  "green",
];
const rowColors4: BlockColor[] = [
  "cyan",
  "magenta",
  "green",
  "yellow",
  "hotpink",
  "red",
];

// Level 2: centered pyramid
const pyStart = [4, 3, 2, 1, 0, 0];
const pyEnd = [5, 6, 7, 8, 9, 9];

// Level 4: missing columns per row
const gaps4 = [
  [2, 5, 8],
  [0, 4, 7, 9],
  [1, 3, 6],
  [2, 5, 8, 9],
  [0, 4, 7],
  [1, 3, 6, 9],
];

export const LEVELS: Level[] = [
  { speed: 1.0, blocks: grid((_, row) => rowColors1[row]) },
  {
    speed: 1.1,
    blocks: grid((col, row) =>
      col >= pyStart[row] && col <= pyEnd[row] ? rowColors2[row] : null,
    ),
  },
  {
    speed: 1.21,
    blocks: grid((col, row) =>
      (col + row) % 2 === 0 ? (row < 3 ? "yellow" : "magenta") : null,
    ),
  },
  {
    speed: 1.33,
    blocks: grid((col, row) =>
      gaps4[row].includes(col) ? null : rowColors4[row],
    ),
  },
  {
    speed: 1.46,
    blocks: grid((col, row) => {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (!isFrame && !isCross) return null;
      return isCross && !isFrame ? "hotpink" : "cyan";
    }),
  },
];

// Fruit atlas for the Snake engine: pixel-art row of the reference sheet, cropped to 3790×160.
// Image from https://www.spriters-resource.com/browser_games/googlesnakegame/
// (references/source-assets/snake-assets/, sprites.js). Same x and w as the original atlas, y moved to 0.

export const FRUIT_SPRITE_SRC = "/games/snake/fruits.png";

export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Every fruit is worth the same; the engine picks one at random for each new fruit
export const FRUITS: readonly SpriteRect[] = [
  { x: 34, y: 0, w: 110, h: 160 },
  { x: 186, y: 0, w: 150, h: 160 },
  { x: 378, y: 0, w: 110, h: 160 },
  { x: 540, y: 0, w: 130, h: 160 },
  { x: 712, y: 0, w: 130, h: 160 },
  { x: 894, y: 0, w: 110, h: 160 },
  { x: 1066, y: 0, w: 110, h: 160 },
  { x: 1228, y: 0, w: 130, h: 160 },
  { x: 1400, y: 0, w: 130, h: 160 },
  { x: 1582, y: 0, w: 110, h: 160 },
  { x: 1734, y: 0, w: 150, h: 160 },
  { x: 1906, y: 0, w: 150, h: 160 },
  { x: 2068, y: 0, w: 170, h: 160 },
  { x: 2250, y: 0, w: 140, h: 160 },
  { x: 2432, y: 0, w: 130, h: 160 },
  { x: 2604, y: 0, w: 130, h: 160 },
  { x: 2786, y: 0, w: 110, h: 160 },
  { x: 2948, y: 0, w: 130, h: 160 },
  { x: 3110, y: 0, w: 150, h: 160 },
  { x: 3302, y: 0, w: 110, h: 160 },
  { x: 3454, y: 0, w: 150, h: 160 },
  { x: 3637, y: 0, w: 130, h: 160 },
];

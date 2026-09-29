// Source-preview colors only. Wallpaper exports use the native grayscale BMP encoder.
export type GbPaletteKey = 'dmg' | 'pocket' | 'bw' | 'sgb';

export const GB_PALETTES: Record<GbPaletteKey, readonly (readonly [number, number, number])[]> = {
  dmg: [[155, 188, 15], [139, 172, 15], [48, 98, 48], [15, 56, 15]],
  pocket: [[196, 207, 161], [139, 149, 109], [77, 83, 60], [31, 31, 15]],
  bw: [[255, 255, 255], [170, 170, 170], [85, 85, 85], [0, 0, 0]],
  sgb: [[247, 231, 198], [214, 142, 73], [166, 55, 37], [51, 30, 80]],
};

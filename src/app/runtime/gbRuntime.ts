export type GbRuntime = {
  sessionVersion: number;
  rawBytes: Uint8Array | null;
  pixels: Uint8Array | null;
  paletteRemap: number[] | null;
};

export function createGbRuntime(): GbRuntime {
  return {
    sessionVersion: 0,
    rawBytes: null,
    pixels: null,
    paletteRemap: null,
  };
}

import { describe, expect, it } from 'vitest';

import { encodeGrayBmp } from '../../src/domain/formats/bmpGray';

describe('encodeGrayBmp', () => {
  it('writes a valid 4-color grayscale BMP header, palette, and pixel row', () => {
    const bytes = encodeGrayBmp(new Uint8Array([0, 3]), 2, 1);
    const view = new DataView(bytes.buffer);

    expect(bytes[0]).toBe(0x42);
    expect(bytes[1]).toBe(0x4d);
    expect(view.getInt32(18, true)).toBe(2);
    expect(view.getInt32(22, true)).toBe(-1);
    expect(view.getUint32(2, true)).toBe(bytes.length);
    expect(view.getUint32(10, true)).toBe(70);
    expect(view.getUint32(14, true)).toBe(40);
    expect(view.getUint16(26, true)).toBe(1);
    expect(view.getUint16(28, true)).toBe(4);
    expect(view.getUint32(30, true)).toBe(0);
    expect(view.getUint32(34, true)).toBe(4);
    expect(view.getUint32(46, true)).toBe(4);
    expect(view.getUint32(50, true)).toBe(4);

    expect(Array.from(bytes.slice(54, 70))).toEqual([
      0, 0, 0, 0, 85, 85, 85, 0, 170, 170, 170, 0, 255, 255, 255, 0,
    ]);
    expect(Array.from(bytes.slice(70, 74))).toEqual([0x03, 0x00, 0x00, 0x00]);
  });

  it.each([[1, 3], [7, 5], [9, 3], [480, 800], [528, 792]])(
    'round-trips %ix%i through CrossPoint native-palette mapping', (width, height) => {
      const pixels = Uint8Array.from({ length: width * height }, (_, i) => (i % width + Math.floor(i / width)) % 4);
      const bytes = encodeGrayBmp(pixels, width, height);
      const view = new DataView(bytes.buffer);
      const rowBytes = Math.floor((width * 4 + 31) / 32) * 4;
      expect(bytes.length).toBe(70 + rowBytes * height);

      // CrossPoint 1.6.5 Bitmap.cpp: palette luminance, native detection, then lum >> 6.
      const paletteLevels = Array.from({ length: 4 }, (_, i) => {
        const offset = 54 + i * 4;
        const luminance = (77 * bytes[offset + 2] + 150 * bytes[offset + 1] + 29 * bytes[offset]) >> 8;
        const level = luminance >> 6;
        expect(Math.abs(luminance - level * 85)).toBeLessThanOrEqual(21);
        return level;
      });
      expect(paletteLevels).toEqual([0, 1, 2, 3]);

      const decoded = Uint8Array.from(pixels, (_, i) => {
        const x = i % width;
        const y = Math.floor(i / width);
        const packed = bytes[view.getUint32(10, true) + y * rowBytes + (x >> 1)];
        return paletteLevels[x % 2 ? packed & 15 : packed >> 4];
      });
      expect(decoded).toEqual(pixels);
    },
  );
});

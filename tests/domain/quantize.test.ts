import { describe, expect, it } from 'vitest';

import { DEFAULT_QUANT_PRESET, GRAY_DISP, getQuantThresholds, getQuantProfile, getActiveQuantThresholds, quantize } from '../../src/domain/quantize';

describe('quantize', () => {
  it('exports the display grayscale palette', () => {
    expect(GRAY_DISP).toEqual([0, 85, 170, 255]);
  });

  it('uses the expected threshold boundaries', () => {
    const t = getQuantThresholds('pr1614');
    expect(quantize(42, t)).toBe(0);
    expect(quantize(43, t)).toBe(1);
    expect(quantize(127, t)).toBe(1);
    expect(quantize(128, t)).toBe(2);
    expect(quantize(212, t)).toBe(2);
    expect(quantize(213, t)).toBe(3);
  });

  it('maps every integer luminance to the nearest native shade with PR1614', () => {
    const thresholds = getQuantThresholds('pr1614');
    for (let luminance = 0; luminance <= 255; luminance++) {
      expect(quantize(luminance, thresholds)).toBe(Math.round(luminance / 85));
    }
  });

  it('quantizes against the master preset thresholds', () => {
    const t = getQuantThresholds('master');
    expect(quantize(44, t)).toBe(0);
    expect(quantize(45, t)).toBe(1);
    expect(quantize(70, t)).toBe(2);
    expect(quantize(140, t)).toBe(3);
  });

  it('exposes per-preset thresholds', () => {
    expect(getQuantThresholds('pr1614')).toEqual([43, 128, 213]);
    expect(getQuantThresholds('master')).toEqual([45, 70, 140]);
    expect(DEFAULT_QUANT_PRESET).toBe('pr1614');
  });

  it('getQuantProfile returns correct profiles', () => {
    const pr1614 = getQuantProfile('pr1614');
    expect(pr1614.ditherThresholds).toEqual(pr1614.thresholds);
    expect(pr1614.ditherLevels).toEqual([0, 85, 170, 255]);
    expect(Array.from(pr1614.ditherLevels)).toEqual(Array.from(GRAY_DISP));

    const master = getQuantProfile('master');
    expect(master).toEqual({
      thresholds: [45, 70, 140],
      ditherThresholds: [30, 55, 150],
      ditherLevels: [15, 35, 90, 210],
    });
  });
});

describe('getActiveQuantThresholds', () => {
  it('pr1614 dither-on and dither-off both return [43, 128, 213] (triples coincide)', () => {
    expect(getActiveQuantThresholds('pr1614', true)).toEqual([43, 128, 213]);
    expect(getActiveQuantThresholds('pr1614', false)).toEqual([43, 128, 213]);
  });

  it('master dither-on returns the dither triple [30, 55, 150]', () => {
    expect(getActiveQuantThresholds('master', true)).toEqual([30, 55, 150]);
  });

  it('master dither-off returns the hard triple [45, 70, 140]', () => {
    expect(getActiveQuantThresholds('master', false)).toEqual([45, 70, 140]);
  });
});

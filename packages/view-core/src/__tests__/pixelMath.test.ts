import { test, expect, describe } from 'bun:test';
import { pixelDistance, pixelsToMeters, estimateWalkTime } from '../utils/pixelMath.ts';

describe('pixelDistance', () => {
  test('3-4-5 right triangle returns 5', () => {
    expect(pixelDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  test('same point returns 0', () => {
    expect(pixelDistance({ x: 10, y: 20 }, { x: 10, y: 20 })).toBe(0);
  });

  test('horizontal distance', () => {
    expect(pixelDistance({ x: 0, y: 5 }, { x: 7, y: 5 })).toBe(7);
  });
});

describe('pixelsToMeters', () => {
  test('100 pixels at scale 0.5 returns 50', () => {
    expect(pixelsToMeters(100, 0.5)).toBe(50);
  });

  test('0 pixels returns 0', () => {
    expect(pixelsToMeters(0, 2)).toBe(0);
  });
});

describe('estimateWalkTime', () => {
  test('140 meters returns 100 seconds (exact division)', () => {
    expect(estimateWalkTime(140)).toBe(100);
  });

  test('0 meters returns 0 seconds', () => {
    expect(estimateWalkTime(0)).toBe(0);
  });

  test('2.1 meters rounds to 2 seconds (2.1/1.4 = 1.5 → rounds up)', () => {
    expect(estimateWalkTime(2.1)).toBe(2);
  });
});

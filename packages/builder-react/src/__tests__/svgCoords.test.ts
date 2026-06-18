import { test, expect, describe } from 'bun:test';
import { toSvgCoords } from '../utils/svgCoords.ts';

const rect = { left: 100, top: 50, width: 800, height: 600 };
const imageSize = { w: 1600, h: 1200 };

describe('toSvgCoords', () => {
  test('center of canvas → center of image', () => {
    const r = toSvgCoords(100 + 400, 50 + 300, rect, imageSize);
    expect(r).toEqual({ x: 800, y: 600 });
  });

  test('top-left corner → (0, 0)', () => {
    const r = toSvgCoords(100, 50, rect, imageSize);
    expect(r).toEqual({ x: 0, y: 0 });
  });

  test('bottom-right corner → image dimensions', () => {
    const r = toSvgCoords(100 + 800, 50 + 600, rect, imageSize);
    expect(r).toEqual({ x: 1600, y: 1200 });
  });

  test('CSS pixel coords below canvas left edge are clamped to x=0', () => {
    const r = toSvgCoords(50, 50, rect, imageSize); // clientX=50 < rect.left=100
    expect(r.x).toBe(0);
  });

  test('CSS pixel coords above canvas top edge are clamped to y=0', () => {
    const r = toSvgCoords(100, 20, rect, imageSize); // clientY=20 < rect.top=50
    expect(r.y).toBe(0);
  });

  test('non-square image scales x and y independently', () => {
    const wideRect = { left: 0, top: 0, width: 400, height: 200 };
    const tallImage = { w: 800, h: 1600 };
    // Click at (100, 100) on a 400x200 canvas with an 800x1600 image
    const r = toSvgCoords(100, 100, wideRect, tallImage);
    expect(r).toEqual({ x: 200, y: 800 }); // 100/400*800=200, 100/200*1600=800
  });

  test('rounds fractional pixel values to integers', () => {
    // Click at 1/3 of the width
    const r = toSvgCoords(100 + 800 / 3, 50, rect, imageSize);
    expect(Number.isInteger(r.x)).toBe(true);
  });
});

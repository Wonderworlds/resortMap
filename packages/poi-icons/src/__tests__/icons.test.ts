import { describe, expect, test } from 'bun:test';
import { POI_ICONS } from '../registry';
import * as Icons from '../index';

describe('POI_ICONS registry', () => {
  test('has exactly 12 entries', () => {
    expect(Object.keys(POI_ICONS)).toHaveLength(12);
  });

  test('every entry has non-empty label and Icon function', () => {
    for (const [, entry] of Object.entries(POI_ICONS)) {
      expect(typeof entry.label).toBe('string');
      expect(entry.label.length).toBeGreaterThan(0);
      expect(typeof entry.Icon).toBe('function');
    }
  });

  test('keys are kebab-case strings', () => {
    const kebabPattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
    for (const key of Object.keys(POI_ICONS)) {
      expect(key).toMatch(kebabPattern);
    }
  });

  test('Icon in registry is same reference as named export', () => {
    expect(POI_ICONS['restaurant']?.Icon).toBe(Icons.RestaurantIcon);
    expect(POI_ICONS['cafe']?.Icon).toBe(Icons.CafeIcon);
  });
});

describe('Named icon exports', () => {
  const expectedExports = [
    'RestaurantIcon',
    'CafeIcon',
    'HotelIcon',
    'ParkingIcon',
    'RestroomIcon',
    'FirstAidIcon',
    'InfoIcon',
    'ShopIcon',
    'PoolIcon',
    'SkiLiftIcon',
    'EntranceIcon',
    'AccessibilityIcon',
  ] as const;

  test.each(expectedExports)('%s is a function', (name) => {
    expect(typeof (Icons as Record<string, unknown>)[name]).toBe('function');
  });
});

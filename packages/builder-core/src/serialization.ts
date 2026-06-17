import type { MapConfig } from '@resort-map/types';
import { validateGwmap, ErrorCode } from '@resort-map/types';

export function serializeGwmap(config: MapConfig): string {
  return JSON.stringify(config);
}

export function parseGwmap(raw: string): MapConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw Object.assign(
      new Error('Failed to parse .gwmap: invalid JSON'),
      { code: ErrorCode.GWMAP_PARSE_ERROR },
    );
  }
  return validateGwmap(parsed);
}

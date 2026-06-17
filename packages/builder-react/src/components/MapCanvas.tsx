import { useMapStore } from '../store/mapStore.ts';

export function MapCanvas(): JSX.Element {
  const mapConfig = useMapStore((s) => s.mapConfig);

  if (!mapConfig) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#9ca3af',
          fontSize: '14px',
        }}
      >
        No map loaded. Set a background image URL to get started.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#e5e7eb' }}>
      {/* SVG canvas added in Story 2.3 */}
    </div>
  );
}

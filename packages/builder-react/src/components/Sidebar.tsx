import { useMapStore } from '../store/mapStore.ts';

export function Sidebar(): JSX.Element {
  const selectedItemId = useMapStore((s) => s.selectedItemId);

  return (
    <div
      style={{
        width: '280px',
        borderLeft: '1px solid #d1d5db',
        padding: '16px',
        overflowY: 'auto',
        background: '#fafafa',
        flexShrink: 0,
      }}
    >
      {selectedItemId == null ? (
        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
          Select a POI or node to edit its properties
        </p>
      ) : (
        <p style={{ fontSize: '14px', margin: 0 }}>Selected: {selectedItemId}</p>
      )}
    </div>
  );
}

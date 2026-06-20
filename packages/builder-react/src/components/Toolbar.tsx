import { useMapStore } from '../store/mapStore';
import type { ActiveTool } from '../store/mapStore';

interface ToolItem {
  tool: ActiveTool;
  label: string;
}

const TOOLS: ToolItem[] = [
  { tool: 'select', label: 'Select' },
  { tool: 'placePoi', label: 'Place POI' },
  { tool: 'drawStreet', label: 'Draw Street' },
  { tool: 'setScale', label: 'Set Scale' },
];

export function Toolbar(): JSX.Element {
  const activeTool = useMapStore((s) => s.activeTool);
  const setActiveTool = useMapStore((s) => s.setActiveTool);
  const undo = useMapStore((s) => s.undo);
  const undoStackLen = useMapStore((s) => s.undoStack.length);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderBottom: '1px solid #d1d5db',
        background: '#f9fafb',
        flexShrink: 0,
      }}
    >
      {TOOLS.map(({ tool, label }) => (
        <button
          key={tool}
          onClick={() => setActiveTool(tool)}
          style={{
            padding: '6px 14px',
            fontWeight: activeTool === tool ? '600' : '400',
            background: activeTool === tool ? '#2563eb' : '#ffffff',
            color: activeTool === tool ? '#ffffff' : '#374151',
            border: `1px solid ${activeTool === tool ? '#2563eb' : '#d1d5db'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {label}
        </button>
      ))}
      <div style={{ marginLeft: 'auto' }}>
        <button
          onClick={undo}
          disabled={undoStackLen === 0}
          style={{
            padding: '6px 14px',
            background: '#ffffff',
            color: undoStackLen === 0 ? '#9ca3af' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: undoStackLen === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          Undo
        </button>
      </div>
    </div>
  );
}

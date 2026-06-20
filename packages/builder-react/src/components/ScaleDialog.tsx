import { useState } from 'react';

const WALK_SPEED_M_PER_MIN = 83.3; // 5 km/h

interface ScaleDialogProps {
  pixelDistance: number;
  onConfirm: (scale: number) => void;
  onCancel: () => void;
}

export function ScaleDialog({ pixelDistance, onConfirm, onCancel }: ScaleDialogProps): JSX.Element {
  const [mode, setMode] = useState<'distance' | 'time'>('distance');
  const [value, setValue] = useState('');

  function computeScale(): number | null {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0 || pixelDistance <= 0) return null;
    const meters = mode === 'distance' ? num : num * WALK_SPEED_M_PER_MIN;
    return meters / pixelDistance;
  }

  const scale = computeScale();

  function onSubmit(): void {
    if (scale !== null) onConfirm(scale);
  }

  return (
    <div style={overlayStyle}>
      <div
        style={dialogStyle}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 600 }}>Set Map Scale</h3>
        <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#6b7280' }}>
          Measured distance: <strong>{Math.round(pixelDistance)} px</strong>
        </p>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          <button onClick={() => setMode('distance')} style={tabStyle(mode === 'distance')}>
            Distance (m)
          </button>
          <button onClick={() => setMode('time')} style={tabStyle(mode === 'time')}>
            Walking time (min)
          </button>
        </div>

        <input
          type="number"
          min="0.01"
          step="any"
          placeholder={mode === 'distance' ? 'e.g. 50' : 'e.g. 2'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
            if (e.key === 'Escape') onCancel();
          }}
          autoFocus
          style={inputStyle}
        />

        {mode === 'time' && (
          <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#9ca3af' }}>
            At 5 km/h walking speed ({WALK_SPEED_M_PER_MIN} m/min)
          </p>
        )}

        {scale !== null && (
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#059669', fontWeight: 500 }}>
            → Scale: {scale.toFixed(5)} m/px
          </p>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={cancelBtnStyle}>
            Cancel
          </button>
          <button onClick={onSubmit} disabled={scale === null} style={confirmBtnStyle(scale !== null)}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const dialogStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  padding: '20px',
  minWidth: '280px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '7px 10px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '14px',
  outline: 'none',
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '5px 8px',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    background: active ? '#2563eb' : '#f3f4f6',
    color: active ? '#ffffff' : '#374151',
    border: `1px solid ${active ? '#2563eb' : '#d1d5db'}`,
    borderRadius: '4px',
    cursor: 'pointer',
  };
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '13px',
  background: '#ffffff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  cursor: 'pointer',
};

function confirmBtnStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 600,
    background: enabled ? '#2563eb' : '#e5e7eb',
    color: enabled ? '#ffffff' : '#9ca3af',
    border: 'none',
    borderRadius: '6px',
    cursor: enabled ? 'pointer' : 'not-allowed',
  };
}

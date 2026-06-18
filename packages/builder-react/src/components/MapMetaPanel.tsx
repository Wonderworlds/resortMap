import { useEffect, useState } from 'react';
import type { MapMeta } from '@resort-map/types';
import { serializeGwmap } from '@resort-map/builder-core';
import { useMapStore } from '../store/mapStore';

export function MapMetaPanel(): JSX.Element {
  const mapConfig = useMapStore((s) => s.mapConfig);
  const activeTool = useMapStore((s) => s.activeTool);
  const initMap = useMapStore((s) => s.initMap);
  const updateMapMeta = useMapStore((s) => s.updateMapMeta);
  const setActiveTool = useMapStore((s) => s.setActiveTool);

  const [urlDraft, setUrlDraft] = useState(mapConfig?.map.backgroundImageUrl ?? '');
  const [scaleDraft, setScaleDraft] = useState(String(mapConfig?.map.scale ?? 1));

  useEffect(() => {
    setUrlDraft(mapConfig?.map.backgroundImageUrl ?? '');
  }, [mapConfig?.map.backgroundImageUrl]);

  useEffect(() => {
    setScaleDraft(String(mapConfig?.map.scale ?? 1));
  }, [mapConfig?.map.scale]);

  function commitUrl(): void {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    if (!mapConfig) {
      const defaultMeta: MapMeta = { backgroundImageUrl: trimmed, center: { x: 0, y: 0 }, scale: 1 };
      initMap(defaultMeta);
    } else {
      updateMapMeta({ backgroundImageUrl: trimmed });
    }
  }

  function commitScale(): void {
    if (!mapConfig) return;
    const parsed = parseFloat(scaleDraft);
    if (isNaN(parsed) || parsed <= 0) return;
    updateMapMeta({ scale: parsed });
  }

  function startSetCenter(): void {
    setActiveTool('setCenter');
  }

  function exportGwmap(): void {
    if (!mapConfig) return;
    const json = serializeGwmap(mapConfig);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map.gwmap';
    a.click();
    URL.revokeObjectURL(url);
  }

  const isSettingCenter = activeTool === 'setCenter';

  return (
    <div style={{ marginBottom: '16px' }}>
      <h3 style={sectionHeadingStyle}>Map Properties</h3>

      <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>Background Image URL</label>
        <input
          style={inputStyle}
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onBlur={commitUrl}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          placeholder="https://…/map.png"
        />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>Scale (m/px)</label>
        <input
          style={inputStyle}
          type="number"
          step="0.01"
          min="0"
          value={scaleDraft}
          disabled={!mapConfig}
          onChange={(e) => setScaleDraft(e.target.value)}
          onBlur={commitScale}
        />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>Map Center</label>
        <button
          type="button"
          disabled={!mapConfig || isSettingCenter}
          onClick={startSetCenter}
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: '13px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: !mapConfig || isSettingCenter ? 'not-allowed' : 'pointer',
            background: isSettingCenter ? '#ecfdf5' : '#ffffff',
            color: isSettingCenter ? '#059669' : '#374151',
          }}
        >
          {isSettingCenter ? 'Click on canvas…' : 'Set Center'}
        </button>
      </div>

      <div>
        <button
          type="button"
          disabled={!mapConfig}
          onClick={exportGwmap}
          style={{
            width: '100%',
            padding: '7px 10px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '4px',
            cursor: !mapConfig ? 'not-allowed' : 'pointer',
            background: !mapConfig ? '#e5e7eb' : '#2563eb',
            color: !mapConfig ? '#9ca3af' : '#ffffff',
          }}
        >
          Export .gwmap
        </button>
      </div>
    </div>
  );
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  margin: '0 0 10px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 8px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '13px',
  outline: 'none',
};

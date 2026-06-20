import { useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import type { MapMeta } from '@resort-map/types';
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

  const isSettingCenter = activeTool === 'setCenter';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <TextField
        label="Background Image URL"
        size="small"
        fullWidth
        value={urlDraft}
        onChange={(e) => setUrlDraft(e.target.value)}
        onBlur={commitUrl}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        placeholder="https://…/map.png"
      />

      <TextField
        label="Scale (m/px)"
        size="small"
        fullWidth
        type="number"
        inputProps={{ step: 0.01, min: 0 }}
        value={scaleDraft}
        disabled={!mapConfig}
        onChange={(e) => setScaleDraft(e.target.value)}
        onBlur={commitScale}
      />

      <Button
        variant="outlined"
        size="small"
        fullWidth
        disabled={!mapConfig}
        onClick={startSetCenter}
        color={isSettingCenter ? 'success' : 'primary'}
      >
        {isSettingCenter ? 'Click on canvas…' : 'Set Center'}
      </Button>
    </Box>
  );
}

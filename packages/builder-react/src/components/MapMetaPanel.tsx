import { useEffect, useRef, useState } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const url = mapConfig?.map.backgroundImageUrl ?? '';
    setUrlDraft(url);
    if (!url.startsWith('blob:')) setLocalFileName(null);
  }, [mapConfig?.map.backgroundImageUrl]);

  useEffect(() => {
    setScaleDraft(String(mapConfig?.map.scale ?? 1));
  }, [mapConfig?.map.scale]);

  function applyUrl(url: string): void {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!mapConfig) {
      const defaultMeta: MapMeta = { backgroundImageUrl: trimmed, center: { x: 0, y: 0 }, scale: 1 };
      initMap(defaultMeta);
    } else {
      updateMapMeta({ backgroundImageUrl: trimmed });
    }
  }

  function commitUrl(): void {
    applyUrl(urlDraft);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    const prev = mapConfig?.map.backgroundImageUrl;
    if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
    const url = URL.createObjectURL(file);
    setUrlDraft(url);
    setLocalFileName(file.name);
    applyUrl(url);
    // Reset input so the same file can be re-picked
    e.target.value = '';
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
  const displayValue = localFileName ?? urlDraft;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box>
        <TextField
          label="Background Image"
          size="small"
          fullWidth
          value={displayValue}
          onChange={(e) => { setLocalFileName(null); setUrlDraft(e.target.value); }}
          onBlur={commitUrl}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          placeholder="https://…/map.png or pick a file"
        />
        {localFileName && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            Local file — session only
          </Typography>
        )}
      </Box>

      <Button
        variant="outlined"
        size="small"
        fullWidth
        onClick={() => fileInputRef.current?.click()}
      >
        Browse local file…
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.svg"
        style={{ display: 'none' }}
        onChange={onFileChange}
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

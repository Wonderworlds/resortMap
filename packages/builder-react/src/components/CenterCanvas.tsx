import { useState } from 'react';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import { MapViewer } from '@resort-map/view-react';
import { useMapStore } from '../store/mapStore';
import { MapCanvas } from './MapCanvas';

type Mode = 'builder' | 'preview';

export function CenterCanvas(): JSX.Element {
  const mapConfig = useMapStore((s) => s.mapConfig);
  const [mode, setMode] = useState<Mode>('builder');

  function handleModeChange(_: React.MouseEvent, newMode: Mode | null): void {
    if (newMode !== null) setMode(newMode);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          p: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          size="small"
          aria-label="canvas mode"
        >
          <ToggleButton
            value="builder"
            aria-label="Builder mode"
            sx={{
              px: 3,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              },
            }}
          >
            Builder
          </ToggleButton>
          <ToggleButton
            value="preview"
            aria-label="Preview mode"
            sx={{
              px: 3,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              },
            }}
          >
            Preview
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* MapCanvas always mounted so zoom/pan local state is preserved when switching modes */}
        <Box
          sx={{
            display: mode === 'builder' ? 'block' : 'none',
            height: '100%',
            position: 'relative',
          }}
        >
          <MapCanvas />
        </Box>

        {mode === 'preview' && (
          mapConfig
            ? <MapViewer source={mapConfig} preview={true} />
            : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <Typography color="text.secondary">No map loaded</Typography>
              </Box>
            )
        )}
      </Box>
    </Box>
  );
}

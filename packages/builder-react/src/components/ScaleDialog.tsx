import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

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
    <Dialog open onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Set Map Scale</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Measured distance: <strong>{Math.round(pixelDistance)} px</strong>
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => { if (v) setMode(v as 'distance' | 'time'); }}
            size="small"
            fullWidth
          >
            <ToggleButton value="distance">Distance (m)</ToggleButton>
            <ToggleButton value="time">Walking time (min)</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <TextField
          type="number"
          fullWidth
          size="small"
          autoFocus
          placeholder={mode === 'distance' ? 'e.g. 50' : 'e.g. 2'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
            if (e.key === 'Escape') onCancel();
          }}
          inputProps={{ min: 0.01, step: 'any' }}
        />

        {mode === 'time' && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            At 5 km/h walking speed ({WALK_SPEED_M_PER_MIN} m/min)
          </Typography>
        )}

        {scale !== null && (
          <Typography variant="body2" color="success.main" sx={{ mt: 1, fontWeight: 500 }}>
            → Scale: {scale.toFixed(5)} m/px
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" disabled={scale === null} onClick={onSubmit}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}

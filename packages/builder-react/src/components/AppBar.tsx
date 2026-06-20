import { useState } from 'react';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import CloseIcon from '@mui/icons-material/Close';
import { serializeGwmap } from '@resort-map/builder-core';
import { useMapStore } from '../store/mapStore';

function downloadGwmap(): void {
  const mapConfig = useMapStore.getState().mapConfig;
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

export function AppBar(): JSX.Element {
  const mapConfig = useMapStore((s) => s.mapConfig);
  const undoStack = useMapStore((s) => s.undoStack);
  const redoStack = useMapStore((s) => s.redoStack);
  const undo = useMapStore((s) => s.undo);
  const redo = useMapStore((s) => s.redo);
  const initMap = useMapStore((s) => s.initMap);

  const [showQuitDialog, setShowQuitDialog] = useState(false);

  const hasMap = mapConfig !== null;
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  function handleQuitConfirm(): void {
    setShowQuitDialog(false);
    // TODO: differentiate Save vs Export when server target exists
    initMap({ backgroundImageUrl: '', center: { x: 0, y: 0 }, scale: 1 });
  }

  return (
    <>
      <MuiAppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ mr: 2 }}>
            ResortMap
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
            {/* TODO: differentiate Save vs Export when server target exists */}
            <Button
              variant="contained"
              color="inherit"
              disabled={!hasMap}
              onClick={downloadGwmap}
              sx={{ color: 'primary.main', bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              disabled={!hasMap}
              onClick={downloadGwmap}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white' } }}
            >
              Export
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Undo (Ctrl+Z)">
              <span>
                <IconButton
                  color="inherit"
                  disabled={!canUndo}
                  onClick={undo}
                  aria-label="Undo"
                >
                  <UndoIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Redo (Ctrl+Y)">
              <span>
                <IconButton
                  color="inherit"
                  disabled={!canRedo}
                  onClick={redo}
                  aria-label="Redo"
                >
                  <RedoIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Quit">
              <IconButton
                color="inherit"
                onClick={() => setShowQuitDialog(true)}
                aria-label="Quit"
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </MuiAppBar>

      <Dialog open={showQuitDialog} onClose={() => setShowQuitDialog(false)}>
        <DialogTitle>Discard unsaved changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your current map will be lost. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQuitDialog(false)}>Cancel</Button>
          <Button onClick={handleQuitConfirm} color="error" variant="contained">
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

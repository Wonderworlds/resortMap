import { useEffect } from 'react';
import Box from '@mui/material/Box';
import { AppBar } from './components/AppBar';
import { LeftPanel } from './components/LeftPanel';
import { MapCanvas } from './components/MapCanvas';
import { Sidebar } from './components/Sidebar';
import { useMapStore } from './store/mapStore';

export function App(): JSX.Element {
  const undo = useMapStore((s) => s.undo);
  const redo = useMapStore((s) => s.redo);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeftPanel />
        <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapCanvas />
        </Box>
        <Sidebar />
      </Box>
    </Box>
  );
}

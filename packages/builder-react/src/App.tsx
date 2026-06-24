import { useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import { ThemeProvider } from '@mui/material/styles';
import { AppBar } from './components/AppBar';
import { CenterCanvas } from './components/CenterCanvas';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { useMapStore } from './store/mapStore';
import { createAppTheme } from './theme';
import type { ThemeConfig } from './theme';
import type { MapConfig } from '@resort-map/types';

export interface AppProps {
  themeConfig?: ThemeConfig;
  onSave?: (config: MapConfig) => void;
  onQuit?: () => void;
}

export function App({ themeConfig, onSave, onQuit }: AppProps): JSX.Element {
  const undo = useMapStore((s) => s.undo);
  const redo = useMapStore((s) => s.redo);

  const theme = useMemo(() => createAppTheme(themeConfig), [themeConfig]);

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
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar onSave={onSave} onQuit={onQuit} />
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <LeftPanel />
          <CenterCanvas />
        </Box>
        {/* RightPanel uses position:fixed, so it sits outside the flex row */}
        <RightPanel />
      </Box>
    </ThemeProvider>
  );
}

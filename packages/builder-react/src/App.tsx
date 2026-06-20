import { useEffect } from 'react';
import { AppBar } from './components/AppBar';
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', margin: 0, fontFamily: 'sans-serif' }}>
      <AppBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapCanvas />
        </div>
        <Sidebar />
      </div>
    </div>
  );
}

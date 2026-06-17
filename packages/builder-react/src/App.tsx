import { Toolbar } from './components/Toolbar.tsx';
import { MapCanvas } from './components/MapCanvas.tsx';
import { Sidebar } from './components/Sidebar.tsx';

export function App(): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', margin: 0, fontFamily: 'sans-serif' }}>
      <Toolbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapCanvas />
        </div>
        <Sidebar />
      </div>
    </div>
  );
}

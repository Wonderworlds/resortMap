import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import NearMeIcon from '@mui/icons-material/NearMe';
import AddLocationIcon from '@mui/icons-material/AddLocation';
import TimelineIcon from '@mui/icons-material/Timeline';
import StraightenIcon from '@mui/icons-material/Straighten';
import PanToolIcon from '@mui/icons-material/PanTool';
import { useMapStore } from '../store/mapStore';
import type { ActiveTool } from '../store/mapStore';
import { MapMetaPanel } from './MapMetaPanel';

const DRAWER_WIDTH = 240;

const TOOL_BUTTONS: { value: ActiveTool; label: string; Icon: React.ComponentType }[] = [
  { value: 'select', label: 'Select', Icon: NearMeIcon },
  { value: 'placePoi', label: 'Place POI', Icon: AddLocationIcon },
  { value: 'drawStreet', label: 'Draw Street', Icon: TimelineIcon },
  { value: 'setScale', label: 'Set Scale', Icon: StraightenIcon },
  { value: 'pan', label: 'Pan', Icon: PanToolIcon },
];

export function LeftPanel(): JSX.Element {
  const activeTool = useMapStore((s) => s.activeTool);
  const setActiveTool = useMapStore((s) => s.setActiveTool);

  function handleToolChange(_: React.MouseEvent, value: ActiveTool | null): void {
    if (value !== null) setActiveTool(value);
  }

  // Only highlight palette tools; setCenter is activated via the Map Config section
  const paletteValue = TOOL_BUTTONS.some((t) => t.value === activeTool) ? activeTool : null;

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'auto',
        },
      }}
    >
      <Box sx={{ p: 1.5 }}>
        <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
          Tools
        </Typography>

        <ToggleButtonGroup
          orientation="vertical"
          exclusive
          value={paletteValue}
          onChange={handleToolChange}
          fullWidth
          size="small"
        >
          {TOOL_BUTTONS.map(({ value, label, Icon }) => (
            <ToggleButton key={value} value={value} sx={{ justifyContent: 'flex-start', gap: 1 }}>
              <Icon />
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Divider sx={{ my: 2 }} />

        <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
          Map Properties
        </Typography>

        <MapMetaPanel />
      </Box>
    </Drawer>
  );
}

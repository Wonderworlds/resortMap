import { useRef, useState } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import Tooltip from '@mui/material/Tooltip';
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

  const [activeTab, setActiveTab] = useState(0);
  const prevToolRef = useRef<ActiveTool>(activeTool);

  function handleTabChange(_: React.SyntheticEvent, newTab: number): void {
    if (newTab === 1) {
      prevToolRef.current = activeTool;
      setActiveTool('select');
    } else if (newTab === 0) {
      setActiveTool(prevToolRef.current);
    }
    setActiveTab(newTab);
  }

  function handleToolSelect(tool: ActiveTool): void {
    setActiveTool(tool);
  }

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
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab label="Tools" />
        <Tab label="Content" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 0 && (
          <Box sx={{ p: 1.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              {TOOL_BUTTONS.map(({ value, label, Icon }) => {
                const isActive = activeTool === value;
                return (
                  <Tooltip title={label} key={value}>
                    <span>
                      <ButtonBase
                        onClick={() => handleToolSelect(value)}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5,
                          height: 72,
                          width: '100%',
                          border: '1px solid',
                          borderRadius: 1,
                          borderColor: isActive ? 'primary.main' : 'divider',
                          bgcolor: isActive ? 'primary.main' : 'background.paper',
                          color: isActive ? 'primary.contrastText' : 'text.primary',
                          transition: 'background-color 0.15s, color 0.15s, border-color 0.15s',
                          '&:hover': { bgcolor: isActive ? 'primary.dark' : 'action.hover' },
                        }}
                      >
                        <Icon />
                        <Typography variant="caption" sx={{ lineHeight: 1.2 }}>
                          {label}
                        </Typography>
                      </ButtonBase>
                    </span>
                  </Tooltip>
                );
              })}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
              Map Config
            </Typography>

            <MapMetaPanel />
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ flex: 1 }} />
        )}
      </Box>
    </Drawer>
  );
}

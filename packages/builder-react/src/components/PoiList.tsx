import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { POI_ICONS } from '@resort-map/poi-icons';
import { useMapStore } from '../store/mapStore';
import type { POI } from '@resort-map/types';

const MAX_VISIBLE_TAGS = 3;

export function PoiList(): JSX.Element {
  const mapConfig = useMapStore((s) => s.mapConfig);
  const selectedItemId = useMapStore((s) => s.selectedItemId);
  const setSelectedItemId = useMapStore((s) => s.setSelectedItemId);
  const setHighlightedPoiId = useMapStore((s) => s.setHighlightedPoiId);
  const setPanTargetPoiId = useMapStore((s) => s.setPanTargetPoiId);

  const pois: POI[] = mapConfig?.pois ?? [];
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (!selectedItemId) return;
    const el = rowRefs.current.get(selectedItemId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedItemId]);

  function handleRowClick(poi: POI): void {
    setSelectedItemId(poi.id);
    setPanTargetPoiId(poi.id);
  }

  if (pois.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, p: 2 }}>
        <Typography variant="body2" color="text.secondary">No POIs placed yet.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflow: 'auto', flex: 1 }}>
      {pois.map((poi) => {
        const iconEntry = poi.icon ? POI_ICONS[poi.icon] : null;
        const IconCmp = iconEntry?.Icon;
        const visibleTags = poi.tags.slice(0, MAX_VISIBLE_TAGS);
        const extraTagCount = poi.tags.length - MAX_VISIBLE_TAGS;
        const isSelected = poi.id === selectedItemId;

        return (
          <Box
            key={poi.id}
            ref={(el: HTMLDivElement | null) => {
              if (el) rowRefs.current.set(poi.id, el);
              else rowRefs.current.delete(poi.id);
            }}
            onClick={() => handleRowClick(poi)}
            onMouseEnter={() => setHighlightedPoiId(poi.id)}
            onMouseLeave={() => setHighlightedPoiId(null)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.75,
              cursor: 'pointer',
              bgcolor: isSelected ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: isSelected ? 'action.selected' : 'action.hover' },
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ flexShrink: 0, width: 24, height: 24 }}>
              {IconCmp
                ? <IconCmp width={24} height={24} />
                : <svg width={24} height={24}><circle cx={12} cy={12} r={10} fill="#ef4444" /></svg>
              }
            </Box>

            <Typography
              variant="body2"
              sx={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {poi.label}
            </Typography>

            {poi.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                {visibleTags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" sx={{ height: 18, fontSize: 10 }} />
                ))}
                {extraTagCount > 0 && (
                  <Chip label={`+${extraTagCount}`} size="small" sx={{ height: 18, fontSize: 10 }} />
                )}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

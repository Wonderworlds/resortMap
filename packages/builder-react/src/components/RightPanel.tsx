import { useState } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { POI_ICONS } from '@resort-map/poi-icons';
import type { POI, GraphNode } from '@resort-map/types';
import { useMapStore } from '../store/mapStore';

export function RightPanel(): JSX.Element {
  const mapConfig = useMapStore((s) => s.mapConfig);
  const selectedItemId = useMapStore((s) => s.selectedItemId);
  const setSelectedItemId = useMapStore((s) => s.setSelectedItemId);
  const updatePoi = useMapStore((s) => s.updatePoi);

  const updateNode = useMapStore((s) => s.updateNode);

  const open = selectedItemId !== null;

  const selectedPoi = selectedItemId && mapConfig
    ? (mapConfig.pois.find((p) => p.id === selectedItemId) ?? null)
    : null;

  const selectedNode = !selectedPoi && selectedItemId && mapConfig
    ? (mapConfig.graph.nodes.find((n) => n.id === selectedItemId) ?? null)
    : null;

  function closePanel(): void {
    setSelectedItemId(null);
  }

  const panelTitle = selectedPoi ? 'POI Properties' : selectedNode ? 'Node Properties' : '';

  return (
    <Drawer
      anchor="right"
      variant="persistent"
      open={open}
      sx={{
        '& .MuiDrawer-paper': {
          width: 320,
          position: 'fixed',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          overflowY: 'auto',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }}>
        <Typography variant="h6">{panelTitle}</Typography>
        <IconButton onClick={closePanel} size="small">
          <ChevronRightIcon />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        {selectedPoi ? (
          <PoiEditor poi={selectedPoi} updatePoi={updatePoi} />
        ) : selectedNode ? (
          <NodeInfo node={selectedNode} updateNode={updateNode} />
        ) : null}
      </Box>
    </Drawer>
  );
}

interface PoiEditorProps {
  poi: POI;
  updatePoi: (poiId: string, patch: Partial<Omit<POI, 'id'>>) => void;
}

function PoiEditor({ poi, updatePoi }: PoiEditorProps): JSX.Element {
  const [labelDraft, setLabelDraft] = useState(poi.label);
  const [nodeIdDraft, setNodeIdDraft] = useState(poi.nodeId ?? '');
  const [newTag, setNewTag] = useState('');

  function commitLabel(): void {
    updatePoi(poi.id, { label: labelDraft });
  }

  function commitNodeId(): void {
    updatePoi(poi.id, { nodeId: nodeIdDraft.trim() || undefined });
  }

  function addTag(): void {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    updatePoi(poi.id, { tags: [...poi.tags, trimmed] });
    setNewTag('');
  }

  function removeTag(tag: string): void {
    updatePoi(poi.id, { tags: poi.tags.filter((t) => t !== tag) });
  }

  function selectIcon(key: string): void {
    updatePoi(poi.id, { icon: key });
  }

  function clearIcon(): void {
    updatePoi(poi.id, { icon: undefined });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Label"
        fullWidth
        size="small"
        value={labelDraft}
        onChange={(e) => setLabelDraft(e.target.value)}
        onBlur={commitLabel}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Tags</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {poi.tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              onDelete={() => removeTag(tag)}
            />
          ))}
        </Box>
        <TextField
          label="Add tag"
          size="small"
          fullWidth
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          onBlur={addTag}
        />
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Icon</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
          {/* None cell */}
          <Tooltip title="None">
            <IconButton
              size="small"
              onClick={clearIcon}
              sx={{
                outline: !poi.icon ? '2px solid' : 'none',
                outlineColor: 'primary.main',
                borderRadius: 1,
              }}
            >
              <Typography variant="caption" sx={{ lineHeight: 1 }}>—</Typography>
            </IconButton>
          </Tooltip>

          {/* Icon cells */}
          {Object.entries(POI_ICONS).map(([key, { label, Icon }]) => (
            <Tooltip key={key} title={label}>
              <IconButton
                size="small"
                onClick={() => selectIcon(key)}
                sx={{
                  outline: poi.icon === key ? '2px solid' : 'none',
                  outlineColor: 'primary.main',
                  borderRadius: 1,
                }}
              >
                <Icon />
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      </Box>

      <TextField
        label="Node ID"
        fullWidth
        size="small"
        value={nodeIdDraft}
        onChange={(e) => setNodeIdDraft(e.target.value)}
        onBlur={commitNodeId}
        placeholder="Link to graph node…"
      />

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={poi.locked ?? false}
            onChange={(e) => updatePoi(poi.id, { locked: e.target.checked })}
          />
        }
        label="Lock position"
      />
    </Box>
  );
}

interface NodeInfoProps {
  node: GraphNode;
  updateNode: (nodeId: string, patch: Partial<Omit<GraphNode, 'id'>>) => void;
}

function NodeInfo({ node, updateNode }: NodeInfoProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  function copyId(): void {
    void navigator.clipboard.writeText(node.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 500);
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>ID</Typography>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Typography
            sx={{
              fontFamily: 'monospace',
              fontSize: 11,
              wordBreak: 'break-all',
              flex: 1,
            }}
          >
            {node.id}
          </Typography>
          <Tooltip title={copied ? 'Copied!' : 'Copy ID'}>
            <IconButton size="small" onClick={copyId}>
              {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Typography variant="body2">
        Position: ({node.position.x}, {node.position.y})
      </Typography>

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={node.locked ?? false}
            onChange={(e) => updateNode(node.id, { locked: e.target.checked })}
          />
        }
        label="Lock position"
      />
    </Box>
  );
}

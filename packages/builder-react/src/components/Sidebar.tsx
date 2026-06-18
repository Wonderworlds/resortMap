import { useState } from 'react';
import type { POI, GraphNode } from '@resort-map/types';
import { useMapStore } from '../store/mapStore';
import { MapMetaPanel } from './MapMetaPanel';

export function Sidebar(): JSX.Element {
  const mapConfig = useMapStore((s) => s.mapConfig);
  const selectedItemId = useMapStore((s) => s.selectedItemId);
  const updatePoi = useMapStore((s) => s.updatePoi);

  const selectedPoi = selectedItemId && mapConfig
    ? (mapConfig.pois.find((p) => p.id === selectedItemId) ?? null)
    : null;

  const selectedNode = !selectedPoi && selectedItemId && mapConfig
    ? (mapConfig.graph.nodes.find((n) => n.id === selectedItemId) ?? null)
    : null;

  return (
    <div
      style={{
        width: '280px',
        borderLeft: '1px solid #d1d5db',
        padding: '16px',
        overflowY: 'auto',
        background: '#fafafa',
        flexShrink: 0,
      }}
    >
      <MapMetaPanel />
      <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '16px' }} />
      {selectedPoi ? (
        <PoiEditor key={selectedPoi.id} poi={selectedPoi} updatePoi={updatePoi} />
      ) : selectedNode ? (
        <NodeInfo node={selectedNode} />
      ) : (
        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
          Select a POI or node to edit its properties
        </p>
      )}
    </div>
  );
}

interface PoiEditorProps {
  poi: POI;
  updatePoi: (poiId: string, patch: Partial<Omit<POI, 'id'>>) => void;
}

function PoiEditor({ poi, updatePoi }: PoiEditorProps): JSX.Element {
  const [labelDraft, setLabelDraft] = useState(poi.label);
  const [iconDraft, setIconDraft] = useState(poi.icon ?? '');
  const [nodeIdDraft, setNodeIdDraft] = useState(poi.nodeId ?? '');
  const [newTag, setNewTag] = useState('');

  function commitLabel(): void {
    updatePoi(poi.id, { label: labelDraft });
  }

  function commitIcon(): void {
    updatePoi(poi.id, { icon: iconDraft.trim() || undefined });
  }

  function commitNodeId(): void {
    updatePoi(poi.id, { nodeId: nodeIdDraft.trim() || undefined });
  }

  function commitTag(): void {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    updatePoi(poi.id, { tags: [...poi.tags, trimmed] });
    setNewTag('');
  }

  function removeTag(tag: string): void {
    updatePoi(poi.id, { tags: poi.tags.filter((t) => t !== tag) });
  }

  return (
    <div>
      <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>POI Properties</h3>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Label</label>
        <input
          style={inputStyle}
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Tags</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
          {poi.tags.map((tag) => (
            <span key={tag} style={chipStyle}>
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                style={chipRemoveStyle}
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          style={inputStyle}
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitTag(); } }}
          onBlur={commitTag}
          placeholder="Add tag…"
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Icon URL</label>
        <input
          style={inputStyle}
          value={iconDraft}
          onChange={(e) => setIconDraft(e.target.value)}
          onBlur={commitIcon}
          placeholder="https://…"
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Node ID</label>
        <input
          style={inputStyle}
          value={nodeIdDraft}
          onChange={(e) => setNodeIdDraft(e.target.value)}
          onBlur={commitNodeId}
          placeholder="Link to graph node…"
        />
      </div>
    </div>
  );
}

interface NodeInfoProps {
  node: GraphNode;
}

function NodeInfo({ node }: NodeInfoProps): JSX.Element {
  function copyId(): void {
    void navigator.clipboard.writeText(node.id);
  }

  return (
    <div>
      <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>Node Properties</h3>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>ID</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#374151',
              wordBreak: 'break-all',
            }}
          >
            {node.id}
          </span>
          <button
            type="button"
            onClick={copyId}
            style={{
              flexShrink: 0,
              fontSize: '11px',
              padding: '2px 6px',
              cursor: 'pointer',
              border: '1px solid #d1d5db',
              borderRadius: '3px',
              background: '#f9fafb',
            }}
          >
            Copy
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Position</label>
        <span style={{ fontSize: '13px', color: '#374151' }}>
          ({node.position.x}, {node.position.y})
        </span>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 8px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '13px',
  outline: 'none',
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  background: '#e5e7eb',
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '12px',
};

const chipRemoveStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0',
  lineHeight: '1',
  fontSize: '14px',
  color: '#6b7280',
};

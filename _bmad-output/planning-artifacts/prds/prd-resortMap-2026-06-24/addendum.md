# Addendum — ResortMap Builder UI/UX Redesign (Epic 7)

## ThemeConfig Design (resolved: Option A)

**Decided:** Full `Partial<ThemeOptions>` from MUI (Floran, 2026-06-24).

```ts
import type { ThemeOptions } from '@mui/material/styles';
export type ThemeConfig = Partial<ThemeOptions>;
```

**README example** (to ship with the package):
```tsx
import { App } from '@resort-map/builder-react';
import type { ThemeConfig } from '@resort-map/builder-react';

const myTheme: ThemeConfig = {
  palette: {
    primary: { main: '#c0392b' },   // swap teal for red
  },
};

<App themeConfig={myTheme} onSave={(config) => console.log(config)} />
```

---

## Viewer Package `preview` Prop — Mechanism Notes

The `@resort-map/viewer` package renders the resort map for visitors. The `preview={true}` mode should:
- Disable the FilterPanel (POI category filters)
- Disable the RoutePanel (if present)
- Disable any distance input or search
- Keep the MapCanvas render-only (no tap/click interaction on POIs beyond visual highlight)
- Show a visual indicator ("Preview mode") so Floran knows he's not in builder

This is a viewer-side change; it belongs in a viewer story within this epic, not a builder story.

---

## Color Palette Reference (from image analysis)

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#009688` | Active tabs, tool squares, toggle segment, switches |
| Primary Dark | `#00796b` | Button hover states |
| Primary Light | `#b2dfdb` | Subtle highlights, hover row background |
| Background Default | `#f0f0f0` | App chrome, canvas surround |
| Background Paper | `#ffffff` | Panels, cards |
| Text Primary | `#333333` | Main labels |
| Text Secondary | `#757575` | Subtitles, captions |
| Divider | `#e0e0e0` | Panel borders, section dividers |
| Canvas Surround | `#e5e7eb` | SVG background rect outside image bounds |

---

## Rejected: Viewer as iframe
Considered embedding the viewer via `<iframe>` to isolate it from builder state. Rejected because:
1. It can't receive live `mapConfig` updates without a message bus.
2. Adds complexity for no benefit since they're in the same Bun process.
3. Using the React component directly is simpler and more performant.

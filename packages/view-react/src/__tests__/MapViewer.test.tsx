import { test, expect, describe, afterEach } from 'bun:test';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import type { MapConfig } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { MapViewer } from '../MapViewer';

const config = complexMap as unknown as MapConfig;
const validJson = JSON.stringify(config);
const invalidJson = '{not: valid}';

afterEach(cleanup);

describe('MapViewer', () => {
  test('renders MapCanvas when source is a valid MapConfig', async () => {
    render(<MapViewer source={config} />);
    await waitFor(() => {
      expect(screen.getByTestId('map-canvas')).toBeDefined();
    });
  });

  test('renders MapCanvas when source is a valid JSON string', async () => {
    render(<MapViewer source={validJson} />);
    await waitFor(() => {
      expect(screen.getByTestId('map-canvas')).toBeDefined();
    });
  });

  test('renders error alert when source is invalid JSON', async () => {
    render(<MapViewer source={invalidJson} />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
  });

  test('renders FilterPanel when source is a valid MapConfig', async () => {
    render(<MapViewer source={config} />);
    await waitFor(() => {
      expect(screen.getByTestId('filter-panel')).toBeDefined();
    });
  });

  test('does not render FilterPanel when preview={true}', async () => {
    render(<MapViewer source={config} preview={true} />);
    await waitFor(() => {
      expect(screen.getByTestId('map-canvas')).toBeDefined();
    });
    expect(document.querySelector('[data-testid="filter-panel"]')).toBeNull();
  });

  test('renders preview badge when preview={true}', async () => {
    render(<MapViewer source={config} preview={true} />);
    await waitFor(() => {
      expect(screen.getByTestId('preview-badge')).toBeDefined();
    });
  });

  test('does not render preview badge when preview is absent', async () => {
    render(<MapViewer source={config} />);
    await waitFor(() => {
      expect(screen.getByTestId('map-canvas')).toBeDefined();
    });
    expect(document.querySelector('[data-testid="preview-badge"]')).toBeNull();
  });
});

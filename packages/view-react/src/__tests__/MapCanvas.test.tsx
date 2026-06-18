import { test, expect, describe, afterEach, beforeEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { MapConfig, ViewerAction, Route } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { MapCanvas } from '../components/MapCanvas';

const config = complexMap as unknown as MapConfig;

afterEach(cleanup);

describe('MapCanvas', () => {
  let dispatchCalls: ViewerAction[];
  let mockDispatch: (action: ViewerAction) => void;

  beforeEach(() => {
    dispatchCalls = [];
    mockDispatch = (action: ViewerAction) => { dispatchCalls.push(action); };
  });

  test('renders outer container, transform div, and SVG overlay', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />);
    expect(screen.getByTestId('map-canvas')).toBeDefined();
    expect(screen.getByTestId('map-transform')).toBeDefined();
    expect(screen.getByTestId('map-overlay')).toBeDefined();
  });

  test('dispatches IMAGE_LOADED on image load', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />);
    const img = document.querySelector('img') as HTMLImageElement;
    Object.defineProperty(img, 'naturalWidth', { value: 1000, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: 800, configurable: true });
    fireEvent.load(img);
    expect(dispatchCalls).toContainEqual({ type: 'IMAGE_LOADED', payload: { width: 1000, height: 800 } });
  });

  test('sets SVG viewBox when imageSize is provided', () => {
    render(<MapCanvas mapConfig={config} imageSize={{ width: 1000, height: 800 }} dispatch={mockDispatch} />);
    const svg = screen.getByTestId('map-overlay');
    expect(svg.getAttribute('viewBox')).toBe('0 0 1000 800');
  });

  test('translates transform div when dragging', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />);
    const container = screen.getByTestId('map-canvas');
    fireEvent.pointerDown(container, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(container, { clientX: 150, clientY: 120 });
    fireEvent.pointerUp(container);
    const transform = screen.getByTestId('map-transform');
    expect(transform.style.transform).toContain('translate(50px, 20px)');
  });

  test('scales transform div on wheel scroll', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />);
    const container = screen.getByTestId('map-canvas');
    fireEvent.wheel(container, { deltaY: -100 }); // scroll up = zoom in
    const transform = screen.getByTestId('map-transform');
    const scaleMatch = transform.style.transform.match(/scale\(([^)]+)\)/);
    expect(scaleMatch).not.toBeNull();
    if (scaleMatch) {
      expect(parseFloat(scaleMatch[1])).toBeGreaterThan(1);
    }
  });
});

describe('MapCanvas — POI Pins', () => {
  let dispatchCalls: ViewerAction[];
  let mockDispatch: (action: ViewerAction) => void;

  beforeEach(() => {
    dispatchCalls = [];
    mockDispatch = (action: ViewerAction) => { dispatchCalls.push(action); };
  });

  test('renders a pin for each POI in filteredPois', () => {
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
        filteredPois={config.pois}
      />
    );
    const pins = document.querySelectorAll('[data-poi-id]');
    expect(pins.length).toBe(config.pois.length);
  });

  test('clicking a pin dispatches SELECT_POI with the POI id', () => {
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
        filteredPois={config.pois}
      />
    );
    const pin = document.querySelector('[data-poi-id="poi-001"]') as Element;
    fireEvent.click(pin);
    expect(dispatchCalls).toContainEqual({ type: 'SELECT_POI', payload: 'poi-001' });
  });

  test('clicking a second pin dispatches SET_ROUTE and SELECT_POI', () => {
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
        filteredPois={config.pois}
        selectedPoiId="poi-001"
      />
    );
    const pin = document.querySelector('[data-poi-id="poi-002"]') as Element;
    fireEvent.click(pin);
    expect(dispatchCalls.some(c => c.type === 'SET_ROUTE')).toBe(true);
    expect(dispatchCalls).toContainEqual({ type: 'SELECT_POI', payload: 'poi-002' });
  });

  test('onRouteRequest is called when a second pin is selected', () => {
    const routeRequestCalls: [string, string][] = [];
    const onRouteRequest = (from: string, to: string) => { routeRequestCalls.push([from, to]); };
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
        filteredPois={config.pois}
        selectedPoiId="poi-001"
        onRouteRequest={onRouteRequest}
      />
    );
    const pin = document.querySelector('[data-poi-id="poi-002"]') as Element;
    fireEvent.click(pin);
    expect(routeRequestCalls).toContainEqual(['poi-001', 'poi-002']);
  });

  test('only renders pins for POIs in filteredPois', () => {
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
        filteredPois={[config.pois[0]!]}
      />
    );
    const pins = document.querySelectorAll('[data-poi-id]');
    expect(pins.length).toBe(1);
    expect(document.querySelector('[data-poi-id="poi-001"]')).not.toBeNull();
    expect(document.querySelector('[data-poi-id="poi-002"]')).toBeNull();
  });

  test('selected pin has different visual style', () => {
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
        filteredPois={config.pois}
        selectedPoiId="poi-001"
      />
    );
    const selectedPin = document.querySelector('[data-poi-id="poi-001"]')!;
    const circle = selectedPin.querySelector('circle');
    expect(circle?.getAttribute('fill')).toBe('#ff4444');
    const unselectedPin = document.querySelector('[data-poi-id="poi-002"]')!;
    const circle2 = unselectedPin.querySelector('circle');
    expect(circle2?.getAttribute('fill')).toBe('#3b82f6');
  });
});

describe('MapCanvas — Route Path', () => {
  let dispatchCalls: ViewerAction[];
  let mockDispatch: (action: ViewerAction) => void;

  beforeEach(() => {
    dispatchCalls = [];
    mockDispatch = (action: ViewerAction) => { dispatchCalls.push(action); };
  });

  test('renders route path element when route prop is provided', () => {
    const route: Route = {
      nodes: [
        { id: 'n1', position: { x: 100, y: 100 } },
        { id: 'n2', position: { x: 200, y: 200 } },
      ],
      distanceMeters: 100,
      walkTimeSeconds: 60,
    };
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
        route={route}
      />
    );
    expect(screen.getByTestId('route-path')).toBeDefined();
  });

  test('does not render route path element when route is null', () => {
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
      />
    );
    expect(document.querySelector('[data-testid="route-path"]')).toBeNull();
  });
});

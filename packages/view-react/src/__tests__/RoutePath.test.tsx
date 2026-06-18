import { test, expect, describe, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import type { Route } from '@resort-map/types';
import { RoutePath } from '../components/RoutePath';

afterEach(cleanup);

const threeNodeRoute: Route = {
  nodes: [
    { id: 'n1', position: { x: 100, y: 200 } },
    { id: 'n2', position: { x: 300, y: 400 } },
    { id: 'n3', position: { x: 500, y: 200 } },
  ],
  distanceMeters: 250,
  walkTimeSeconds: 120,
};

describe('RoutePath', () => {
  test('renders a polyline with correct points from route nodes', () => {
    render(
      <svg>
        <RoutePath route={threeNodeRoute} />
      </svg>
    );
    const polyline = document.querySelector('polyline');
    expect(polyline).not.toBeNull();
    expect(polyline?.getAttribute('points')).toBe('100,200 300,400 500,200');
  });

  test('displays walk time label in "~N min" format', () => {
    render(
      <svg>
        <RoutePath route={threeNodeRoute} />
      </svg>
    );
    const label = screen.getByTestId('route-label');
    expect(label.textContent).toBe('~2 min');
  });

  test('rounds walk time up to nearest minute', () => {
    const partialMinRoute: Route = {
      nodes: [
        { id: 'n1', position: { x: 0, y: 0 } },
        { id: 'n2', position: { x: 100, y: 0 } },
      ],
      distanceMeters: 50,
      walkTimeSeconds: 130,
    };
    render(
      <svg>
        <RoutePath route={partialMinRoute} />
      </svg>
    );
    const label = screen.getByTestId('route-label');
    expect(label.textContent).toBe('~3 min');
  });
});

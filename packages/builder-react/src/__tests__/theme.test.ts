import { test, expect, describe } from 'bun:test';
import { createAppTheme } from '../theme';

describe('createAppTheme', () => {
  test('returns default teal primary palette with no args', () => {
    const theme = createAppTheme();
    expect(theme.palette.primary.main).toBe('#009688');
    expect(theme.palette.primary.contrastText).toBe('#ffffff');
  });

  test('returns default background and text palette with no args', () => {
    const theme = createAppTheme();
    expect(theme.palette.background.paper).toBe('#ffffff');
    expect(theme.palette.background.default).toBe('#f0f0f0');
  });

  test('overrides primary.main when themeConfig provides it', () => {
    const theme = createAppTheme({ palette: { primary: { main: '#c0392b' } } });
    expect(theme.palette.primary.main).toBe('#c0392b');
  });

  test('preserves background defaults when only primary is overridden', () => {
    const theme = createAppTheme({ palette: { primary: { main: '#c0392b' } } });
    expect(theme.palette.background.default).toBe('#f0f0f0');
    expect(theme.palette.background.paper).toBe('#ffffff');
  });
});

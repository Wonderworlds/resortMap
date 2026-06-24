import { createTheme } from '@mui/material/styles';
import type { Theme, ThemeOptions } from '@mui/material/styles';

export type ThemeConfig = Partial<ThemeOptions>;

const defaultThemeOptions: ThemeOptions = {
  palette: {
    primary: { main: '#009688', contrastText: '#ffffff' },
    background: { paper: '#ffffff', default: '#f0f0f0' },
    text: { primary: '#333333' },
    divider: '#e0e0e0',
  },
};

export function createAppTheme(themeConfig?: ThemeConfig): Theme {
  return createTheme(defaultThemeOptions, themeConfig ?? {});
}

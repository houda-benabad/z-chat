export const colors = {
  primary: '#E46C53',
  secondary: '#4D7E82',
  crimson: '#ED2F3C',
  peach: '#F1A167',
  paleGold: '#F3D292',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  border: '#E0E0E0',
  error: '#ED2F3C',
  success: '#4CAF50',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  fontFamily: 'Inter',
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

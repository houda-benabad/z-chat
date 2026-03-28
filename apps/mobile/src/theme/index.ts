import { colors, spacing, typography, borderRadius } from '@z-chat/shared';

export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
} as const;

export type Theme = typeof theme;
export { colors, spacing, typography, borderRadius };

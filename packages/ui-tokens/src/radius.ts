import { colors } from './colors';

export const radius = {
  control: 10,
  button: 12,
  card: 16,
  tile: 20,
  sheet: 32,
  folder: 22,
  pill: 999,
} as const;

export const shadow = {
  nav: {
    shadowColor: colors.textStrong,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  sheet: {
    shadowColor: colors.textStrong,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
} as const;

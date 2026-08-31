import type { Config } from 'tailwindcss';
import { colors } from '@caratom/ui-tokens';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './hooks/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: colors.canvas,
        surface: colors.surface,
        subtle: colors.surfaceSubtle,
        strong: colors.textStrong,
        text: colors.text,
        muted: colors.textMuted,
        border: colors.border,
        brand: colors.brand,
        'brand-strong': colors.brandStrong,
        'brand-soft': colors.brandSoft,
        danger: colors.danger,
        'danger-soft': colors.dangerSoft,
        warning: colors.warning,
        'warning-soft': colors.warningSoft,
        success: colors.success,
        'success-soft': colors.successSoft,
      },
    },
  },
  plugins: [],
};

export default config;

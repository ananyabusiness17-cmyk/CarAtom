export const fontFamily = {
  sans: 'DM Sans',
  medium: 'DM Sans Medium',
  semibold: 'DM Sans Medium',
  bold: 'DM Sans Bold',
} as const;

export const type = {
  displayHero: {
    fontFamily: fontFamily.bold,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700' as const,
  },
  navTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700' as const,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700' as const,
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  price: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700' as const,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as const,
  },
  tabLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
  },
} as const;

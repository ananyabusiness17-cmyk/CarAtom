export const colors = {
  canvas: '#F7FAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F6F9',
  textStrong: '#142532',
  text: '#243744',
  textMuted: '#6A7B86',
  border: '#DCE8EF',
  brand: '#5DB7E8',
  brandStrong: '#176B9E',
  brandSoft: '#EAF6FC',
  success: '#2D8A61',
  successSoft: '#E9F6EF',
  warning: '#B56A22',
  warningSoft: '#FFF3E5',
  sosAccent: '#E07A3D',
  danger: '#C64242',
  dangerSoft: '#FDECEC',
  selectionBg: '#EAF6FC',
  selectionBorder: '#5DB7E8',
} as const;

export type ColorName = keyof typeof colors;

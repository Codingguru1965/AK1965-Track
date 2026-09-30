export interface ColorPalette {
  background: string;
  card: string;
  cardSecondary: string;
  primary: string;
  primaryLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  error: string;
  warning: string;
  success: string;
  surface: string;
  headerBackground: string;
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;
  running: string;
  walking: string;
  cycling: string;
  badgeBackground: string;
  overlay: string;
}

export const darkColors: ColorPalette = {
  background: '#0B0F14',
  card: '#151B23',
  cardSecondary: '#1C232D',
  primary: '#00E676',
  primaryLight: 'rgba(0, 230, 118, 0.15)',
  text: '#FFFFFF',
  textSecondary: '#9AA4B2',
  textMuted: '#627282',
  border: '#222B35',
  divider: '#1A212B',
  error: '#FF5252',
  warning: '#FFAB00',
  success: '#00E676',
  surface: '#151B23',
  headerBackground: '#0B0F14',
  tabBarBackground: '#11161D',
  tabBarActive: '#00E676',
  tabBarInactive: '#627282',
  running: '#00E676',
  walking: '#00B0FF',
  cycling: '#FF9100',
  badgeBackground: 'rgba(0, 230, 118, 0.12)',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const lightColors: ColorPalette = {
  background: '#F5F7FA',
  card: '#FFFFFF',
  cardSecondary: '#EDF1F7',
  primary: '#00A95C',
  primaryLight: 'rgba(0, 169, 92, 0.12)',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#E5E7EB',
  error: '#D32F2F',
  warning: '#F57C00',
  success: '#00A95C',
  surface: '#FFFFFF',
  headerBackground: '#FFFFFF',
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#00A95C',
  tabBarInactive: '#9CA3AF',
  running: '#00A95C',
  walking: '#0288D1',
  cycling: '#ED6C02',
  badgeBackground: 'rgba(0, 169, 92, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

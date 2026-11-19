import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { type ColorValue } from 'react-native';

import { type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Íconos de la app: SF Symbols en iOS y Material Symbols en Android y web. */
const ICONOS = {
  inicio: { ios: 'house.fill', android: 'home', web: 'home' },
  biblioteca: { ios: 'books.vertical.fill', android: 'menu_book', web: 'menu_book' },
  ajustes: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  buscar: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  filtros: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  cerrar: { ios: 'xmark', android: 'close', web: 'close' },
  anterior: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  siguiente: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  sinConexion: { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' },
  libro: { ios: 'book.closed.fill', android: 'book', web: 'book' },
  pdf: { ios: 'doc.richtext', android: 'picture_as_pdf', web: 'picture_as_pdf' },
  grafica: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
  actualizar: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  listo: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
} as const satisfies Record<string, SymbolViewProps['name']>;

export type NombreIcono = keyof typeof ICONOS;

type Props = { nombre: NombreIcono; size?: number; color?: ThemeColor; tinte?: ColorValue };

export function Icono({ nombre, size = 22, color = 'text', tinte }: Props) {
  const theme = useTheme();
  return <SymbolView name={ICONOS[nombre]} size={size} tintColor={tinte ?? theme[color]} />;
}

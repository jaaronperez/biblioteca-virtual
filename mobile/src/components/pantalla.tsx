import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type ScrollViewProps } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Margen lateral: más amplio en tabletas y en la web. */
export function useMargen(): number {
  const { width } = useWindowDimensions();
  return width >= 768 ? Spacing.five : Spacing.three;
}

/**
 * Columnas de la cuadrícula de portadas según el ancho disponible: 2 en un
 * teléfono angosto, 3 en uno normal y más en tabletas o en la web.
 */
export function useColumnas(): { columnas: number; anchoTarjeta: number; separacion: number } {
  const { width } = useWindowDimensions();
  const margen = useMargen();
  const disponible = Math.min(width, MaxContentWidth) - margen * 2;
  const separacion = Spacing.three;
  const columnas = Math.max(2, Math.min(6, Math.floor((disponible + separacion) / (120 + separacion))));
  const anchoTarjeta = Math.floor((disponible - separacion * (columnas - 1)) / columnas);
  return { columnas, anchoTarjeta, separacion };
}

type Props = ScrollViewProps & { children: ReactNode };

/** Pantalla con desplazamiento, fondo del tema y contenido centrado con ancho máximo. */
export function Pantalla({ children, contentContainerStyle, ...resto }: Props) {
  const theme = useTheme();
  const margen = useMargen();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.contenedor, contentContainerStyle]}
      {...resto}>
      <View style={[styles.columna, { paddingHorizontal: margen }]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingBottom: Spacing.five,
  },
  columna: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
});

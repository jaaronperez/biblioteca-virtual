/** Controles pequeños que se repiten en varias pantallas: botón, chip y barra de avance. */

import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icono, type NombreIcono } from '@/components/icono';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BotonProps = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
  icono?: NombreIcono;
  /** Pone el ícono después del texto (por ejemplo, «Siguiente ›»). */
  iconoAlFinal?: boolean;
  deshabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  icono,
  iconoAlFinal,
  deshabilitado,
  style,
}: BotonProps) {
  const theme = useTheme();
  const primario = variante === 'primario';
  const colorTexto: ThemeColor = primario ? 'onTint' : 'text';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        styles.boton,
        {
          backgroundColor: primario ? theme.tint : theme.backgroundElement,
          borderColor: primario ? theme.tint : theme.border,
          opacity: deshabilitado ? 0.45 : pressed ? 0.75 : 1,
        },
        iconoAlFinal && styles.alReves,
        style,
      ]}>
      {icono && <Icono nombre={icono} size={18} color={colorTexto} />}
      <ThemedText type="smallBold" themeColor={colorTexto}>
        {titulo}
      </ThemedText>
    </Pressable>
  );
}

type ChipProps = { titulo: string; activo: boolean; onPress: () => void };

export function Chip({ titulo, activo, onPress }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: activo ? theme.tint : theme.backgroundElement,
          borderColor: activo ? theme.tint : theme.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      <ThemedText type="small" themeColor={activo ? 'onTint' : 'text'}>
        {titulo}
      </ThemedText>
    </Pressable>
  );
}

type BarraProps = { valor: number; meta: number; color?: ThemeColor; alto?: number };

/** Barra de avance. Con un valor mayor que cero siempre se ve al menos una marca. */
export function BarraProgreso({ valor, meta, color = 'tint', alto = 10 }: BarraProps) {
  const theme = useTheme();
  const fraccion = meta > 0 ? Math.min(1, Math.max(0, valor / meta)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: meta, now: valor }}
      style={[styles.barra, { height: alto, backgroundColor: theme.backgroundSelected }]}>
      <View
        style={{
          width: `${fraccion * 100}%`,
          minWidth: valor > 0 ? alto : 0,
          borderRadius: alto / 2,
          backgroundColor: theme[color],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  boton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  alReves: {
    flexDirection: 'row-reverse',
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.large,
    borderWidth: 1,
  },
  barra: {
    flexDirection: 'row',
    borderRadius: 999,
    overflow: 'hidden',
  },
});

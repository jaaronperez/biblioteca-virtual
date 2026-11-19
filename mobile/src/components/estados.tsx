/**
 * Cómo se ve una pantalla mientras carga, cuando falla o cuando no hay datos.
 * Ningún error de red llega a romper la app: se muestra aquí con un botón de reintento.
 */

import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Boton } from '@/components/controles';
import { Icono, type NombreIcono } from '@/components/icono';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ErrorApi, mensajeDeError } from '@/lib/api';

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.centro} accessibilityLiveRegion="polite">
      <ActivityIndicator color={theme.tint} />
      <ThemedText type="small" themeColor="textSecondary">
        {texto}
      </ThemedText>
    </View>
  );
}

type ErrorProps = { error: unknown; onReintentar?: () => void; compacto?: boolean };

export function MensajeError({ error, onReintentar, compacto }: ErrorProps) {
  const theme = useTheme();
  const deRed = error instanceof ErrorApi && ['red', 'tiempo', 'nube'].includes(error.tipo);
  const titulo = deRed ? 'Sin conexión con la biblioteca' : 'Algo salió mal';
  return (
    <View
      accessibilityRole="alert"
      style={[
        compacto ? styles.tarjeta : styles.centro,
        compacto && { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Icono nombre={deRed ? 'sinConexion' : 'cerrar'} size={compacto ? 22 : 34} color="danger" />
      <ThemedText type="heading" style={styles.textoCentrado}>
        {titulo}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.textoCentrado}>
        {mensajeDeError(error)}
      </ThemedText>
      {onReintentar && <Boton titulo="Reintentar" icono="actualizar" onPress={onReintentar} />}
    </View>
  );
}

type VacioProps = { icono?: NombreIcono; titulo: string; texto?: string };

export function Vacio({ icono = 'libro', titulo, texto }: VacioProps) {
  return (
    <View style={styles.centro}>
      <Icono nombre={icono} size={34} color="textSecondary" />
      <ThemedText type="heading" style={styles.textoCentrado}>
        {titulo}
      </ThemedText>
      {texto && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.textoCentrado}>
          {texto}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
  },
  tarjeta: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  textoCentrado: {
    textAlign: 'center',
    maxWidth: 420,
  },
});

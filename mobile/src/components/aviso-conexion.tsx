/**
 * Franja que aparece arriba de todas las pantallas cuando la API deja de responder
 * y desaparece sola cuando vuelve. Mientras tanto, la app sigue mostrando lo que
 * ya tenía en caché.
 */

import { onlineManager, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icono } from '@/components/icono';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAjustes } from '@/lib/ajustes';
import { api, mensajeDeError } from '@/lib/api';

export function AvisoConexion() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { urlApi } = useAjustes();
  const [enLinea, setEnLinea] = useState(onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(setEnLinea), []);

  // Revisa la API cada 20 segundos; si falla, cada 5 hasta que vuelva
  const salud = useQuery({
    queryKey: [urlApi, 'salud', 'aviso'],
    queryFn: ({ signal }) => api.salud(urlApi, signal),
    refetchInterval: (consulta) => (consulta.state.status === 'error' ? 5_000 : 20_000),
    retry: false,
  });

  if (enLinea && !salud.isError) return null;

  const texto = enLinea ? mensajeDeError(salud.error) : 'Sin internet. Mostrando lo último que se cargó.';
  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityHint="Toca para volver a intentar"
      onPress={() => salud.refetch()}
      style={[styles.franja, { backgroundColor: theme.danger, paddingTop: insets.top + Spacing.two }]}>
      <Icono nombre="sinConexion" size={18} tinte="#FFFFFF" />
      <ThemedText type="small" style={styles.texto}>
        {salud.isFetching ? 'Reconectando…' : texto}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  franja: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  texto: {
    color: '#FFFFFF',
    flexShrink: 1,
  },
});

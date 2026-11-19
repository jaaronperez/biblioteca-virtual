import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icono } from '@/components/icono';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Libro } from '@/lib/api';

/** Proporción de las miniaturas que genera el pipeline (página de libro). */
export const PROPORCION_PORTADA = 2 / 3;

/**
 * Portada de un libro. Las miniaturas son públicas en Blob Storage: expo-image las
 * guarda en memoria y en disco, así que al volver a una pantalla no se descargan otra vez.
 */
export function Portada({ libro, ancho }: { libro: Libro; ancho?: number }) {
  const theme = useTheme();
  const [fallo, setFallo] = useState(false);
  const estilo = [
    styles.portada,
    { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
    ancho ? { width: ancho } : styles.llena,
  ];

  if (!libro.portadaUrl || fallo) {
    return (
      <View style={[estilo, styles.sinImagen]}>
        <Icono nombre="libro" size={28} color="textSecondary" />
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={3} style={styles.centrado}>
          {libro.titulo}
        </ThemedText>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: libro.portadaUrl }}
      style={estilo}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
      recyclingKey={libro.id}
      accessibilityLabel={`Portada de ${libro.titulo}`}
      onError={() => setFallo(true)}
    />
  );
}

/** Portada con título y autor; al tocarla abre el detalle del libro. */
export function TarjetaLibro({ libro, ancho }: { libro: Libro; ancho?: number }) {
  return (
    <Link href={{ pathname: '/libro/[id]', params: { id: libro.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${libro.titulo}${libro.autor ? `, de ${libro.autor}` : ''}`}
        style={({ pressed }) => [styles.tarjeta, ancho ? { width: ancho } : styles.llena, pressed && styles.presionada]}>
        <Portada libro={libro} ancho={ancho} />
        <View style={styles.textos}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {libro.titulo}
          </ThemedText>
          {!!libro.autor && (
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {libro.autor}
            </ThemedText>
          )}
          {!!libro.fecha && (
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {libro.fecha}
            </ThemedText>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  portada: {
    aspectRatio: PROPORCION_PORTADA,
    borderRadius: Radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  llena: {
    width: '100%',
  },
  sinImagen: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
  },
  centrado: {
    textAlign: 'center',
  },
  tarjeta: {
    gap: Spacing.two,
  },
  presionada: {
    opacity: 0.75,
  },
  textos: {
    gap: Spacing.half,
  },
});

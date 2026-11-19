import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { BarraProgreso, Boton, Chip } from '@/components/controles';
import { Cargando, MensajeError } from '@/components/estados';
import { Icono } from '@/components/icono';
import { Pantalla } from '@/components/pantalla';
import { TarjetaLibro } from '@/components/portada';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SIN_FILTROS } from '@/lib/api';
import { useBusqueda } from '@/lib/busqueda';
import { useFiltrosDisponibles, useLibros, useProgreso } from '@/lib/consultas';

export default function Inicio() {
  const router = useRouter();
  const theme = useTheme();
  const busqueda = useBusqueda();
  const libros = useLibros('', SIN_FILTROS);
  const filtros = useFiltrosDisponibles();
  const progreso = useProgreso();

  const primeros = libros.data?.pages[0]?.libros ?? [];
  const total = progreso.data?.total;

  const irABiblioteca = (tipo: string | null) => {
    busqueda.reiniciar({ tipo });
    router.navigate('/biblioteca');
  };

  const buscarEnTexto = () => {
    busqueda.reiniciar();
    busqueda.cambiarModo('texto');
    router.navigate('/biblioteca');
  };

  return (
    <Pantalla>
      <View style={styles.encabezado}>
        <ThemedText type="title">Bienvenido</ThemedText>
        <ThemedText themeColor="textSecondary">
          Consulta los libros eclesiásticos digitalizados, busca palabras dentro de sus páginas y léelos desde tu
          teléfono.
        </ThemedText>
      </View>

      <Pressable
        accessibilityRole="search"
        onPress={buscarEnTexto}
        style={({ pressed }) => [
          styles.buscador,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
        ]}>
        <Icono nombre="buscar" color="textSecondary" />
        <ThemedText themeColor="textSecondary">Buscar una palabra en los libros…</ThemedText>
      </Pressable>

      <View style={styles.seccion}>
        <View style={styles.filaTitulo}>
          <ThemedText type="subtitle">Libros disponibles</ThemedText>
          <Boton titulo="Ver todos" variante="secundario" onPress={() => irABiblioteca(null)} />
        </View>
        {libros.isPending ? (
          <Cargando texto="Cargando portadas…" />
        ) : libros.isError && primeros.length === 0 ? (
          <MensajeError error={libros.error} onReintentar={() => libros.refetch()} compacto />
        ) : (
          <FlatList
            horizontal
            data={primeros}
            keyExtractor={(libro) => libro.id}
            renderItem={({ item }) => <TarjetaLibro libro={item} ancho={124} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carrusel}
          />
        )}
      </View>

      {!!filtros.data?.tipos.length && (
        <View style={styles.seccion}>
          <ThemedText type="subtitle">Explorar por tipo</ThemedText>
          <View style={styles.chips}>
            {filtros.data.tipos.map((tipo) => (
              <Chip key={tipo} titulo={tipo} activo={false} onPress={() => irABiblioteca(tipo)} />
            ))}
          </View>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/admin')}
        style={({ pressed }) => [
          styles.tarjeta,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
        ]}>
        <View style={styles.filaTitulo}>
          <View style={styles.filaIcono}>
            <Icono nombre="grafica" color="tint" />
            <ThemedText type="heading">Avance de la digitalización</ThemedText>
          </View>
          <Icono nombre="siguiente" color="textSecondary" />
        </View>
        {total ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {total.subidos.toLocaleString('es-MX')} de {total.meta.toLocaleString('es-MX')} libros en la nube ·{' '}
              {total.paginas.toLocaleString('es-MX')} páginas
            </ThemedText>
            <BarraProgreso valor={total.subidos} meta={total.meta} />
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {progreso.isError ? 'No se pudo cargar el avance.' : 'Cargando avance…'}
          </ThemedText>
        )}
      </Pressable>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  encabezado: {
    gap: Spacing.two,
  },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  seccion: {
    gap: Spacing.three,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  filaIcono: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  carrusel: {
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tarjeta: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
});

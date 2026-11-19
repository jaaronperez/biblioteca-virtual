/**
 * Buscador de la biblioteca, con dos modos:
 * - Libros: filtra por metadatos (título, iglesia, tipo, idioma y años) en `/libros`.
 * - En el texto: busca las palabras dentro de las páginas en `/buscar` (texto completo),
 *   combinadas con los mismos filtros.
 * Los dos modos piden los resultados de a una página y traen la siguiente al llegar al final.
 */

import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Chip } from '@/components/controles';
import { Cargando, MensajeError, Vacio } from '@/components/estados';
import { Icono } from '@/components/icono';
import { useColumnas, useMargen } from '@/components/pantalla';
import { PanelFiltros } from '@/components/panel-filtros';
import { TarjetaLibro } from '@/components/portada';
import { TextoResaltado } from '@/components/resaltado';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { contarFiltros, SIN_FILTROS, type Resultado } from '@/lib/api';
import { useBusqueda } from '@/lib/busqueda';
import { useBusquedaEnTexto, useLibros, useValorPausado } from '@/lib/consultas';

export default function Biblioteca() {
  const theme = useTheme();
  const margen = useMargen();
  const { texto, cambiarTexto, modo, cambiarModo, filtros, cambiarFiltros } = useBusqueda();
  const [verFiltros, setVerFiltros] = useState(false);
  const textoPausado = useValorPausado(texto.trim());
  const cuantosFiltros = contarFiltros(filtros);

  const encabezado = (
    <View style={styles.encabezado}>
      <View style={[styles.campo, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Icono nombre="buscar" color="textSecondary" size={20} />
        <TextInput
          accessibilityLabel="Buscar"
          value={texto}
          onChangeText={cambiarTexto}
          placeholder={modo === 'libros' ? 'Buscar por título…' : 'Palabras dentro de las páginas…'}
          placeholderTextColor={theme.textSecondary}
          returnKeyType="search"
          autoCorrect={false}
          style={[styles.entrada, { color: theme.text }]}
        />
        {texto.length > 0 && (
          <Pressable accessibilityLabel="Borrar búsqueda" hitSlop={10} onPress={() => cambiarTexto('')}>
            <Icono nombre="cerrar" color="textSecondary" size={18} />
          </Pressable>
        )}
      </View>

      <View style={styles.fila}>
        <Chip titulo="Libros" activo={modo === 'libros'} onPress={() => cambiarModo('libros')} />
        <Chip titulo="En el texto" activo={modo === 'texto'} onPress={() => cambiarModo('texto')} />
        <View style={styles.espacio} />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: verFiltros }}
          onPress={() => setVerFiltros((v) => !v)}
          style={({ pressed }) => [
            styles.botonFiltros,
            {
              borderColor: cuantosFiltros ? theme.tint : theme.border,
              backgroundColor: theme.backgroundElement,
              opacity: pressed ? 0.75 : 1,
            },
          ]}>
          <Icono nombre="filtros" size={18} color={cuantosFiltros ? 'tint' : 'text'} />
          <ThemedText type="smallBold" themeColor={cuantosFiltros ? 'tint' : 'text'}>
            Filtros{cuantosFiltros ? ` (${cuantosFiltros})` : ''}
          </ThemedText>
        </Pressable>
      </View>

      {verFiltros && (
        <PanelFiltros
          filtros={filtros}
          onCambiar={cambiarFiltros}
          onLimpiar={() => cambiarFiltros(SIN_FILTROS)}
        />
      )}
    </View>
  );

  return (
    <View style={[styles.pantalla, { backgroundColor: theme.background }]}>
      <View style={[styles.columna, { paddingHorizontal: margen }]}>
        {modo === 'libros' ? (
          <ResultadosLibros encabezado={encabezado} titulo={textoPausado} />
        ) : (
          <ResultadosTexto encabezado={encabezado} consulta={textoPausado} />
        )}
      </View>
    </View>
  );
}

function ResultadosLibros({ encabezado, titulo }: { encabezado: React.ReactElement; titulo: string }) {
  const { filtros } = useBusqueda();
  const { columnas, anchoTarjeta, separacion } = useColumnas();
  const consulta = useLibros(titulo, filtros);
  const libros = consulta.data?.pages.flatMap((p) => p.libros) ?? [];

  return (
    <FlatList
      // Cambiar el número de columnas exige volver a montar la lista
      key={`columnas-${columnas}`}
      data={libros}
      numColumns={columnas}
      keyExtractor={(libro) => libro.id}
      renderItem={({ item }) => <TarjetaLibro libro={item} ancho={anchoTarjeta} />}
      columnWrapperStyle={{ gap: separacion }}
      contentContainerStyle={[styles.lista, { gap: Spacing.four }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={
        <View style={styles.cabeceraLista}>
          {encabezado}
          <Resumen consulta={consulta} cantidad={libros.length} unidad="libros" />
        </View>
      }
      ListEmptyComponent={
        <Estado
          consulta={consulta}
          vacio={<Vacio titulo="No hay libros con esos filtros" texto="Prueba con otro título o quita algún filtro." />}
        />
      }
      ListFooterComponent={<Pie consulta={consulta} hay={libros.length > 0} />}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (consulta.hasNextPage && !consulta.isFetchingNextPage && !consulta.isError) consulta.fetchNextPage();
      }}
      refreshing={consulta.isRefetching && !consulta.isFetchingNextPage}
      onRefresh={() => consulta.refetch()}
    />
  );
}

function ResultadosTexto({ encabezado, consulta: q }: { encabezado: React.ReactElement; consulta: string }) {
  const { filtros } = useBusqueda();
  const consulta = useBusquedaEnTexto(q, filtros);
  const resultados = consulta.data?.pages.flatMap((p) => p.resultados) ?? [];
  const corta = q.length < 2;

  return (
    <FlatList
      data={corta ? [] : resultados}
      keyExtractor={(r) => `${r.bookId}-${r.numero}`}
      renderItem={({ item }) => <TarjetaResultado resultado={item} consulta={q} />}
      contentContainerStyle={[styles.lista, { gap: Spacing.three }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={
        <View style={styles.cabeceraLista}>
          {encabezado}
          {!corta && <Resumen consulta={consulta} cantidad={resultados.length} unidad="páginas" />}
        </View>
      }
      ListEmptyComponent={
        corta ? (
          <Vacio
            icono="buscar"
            titulo="Busca dentro de los libros"
            texto="Escribe una o varias palabras. Se muestran las páginas que las contienen todas, de la más a la menos relevante."
          />
        ) : (
          <Estado
            consulta={consulta}
            vacio={<Vacio icono="buscar" titulo="Sin coincidencias" texto="Ninguna página contiene todas esas palabras con los filtros elegidos." />}
          />
        )
      }
      ListFooterComponent={corta ? null : <Pie consulta={consulta} hay={resultados.length > 0} />}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (consulta.hasNextPage && !consulta.isFetchingNextPage && !consulta.isError) consulta.fetchNextPage();
      }}
    />
  );
}

function TarjetaResultado({ resultado, consulta }: { resultado: Resultado; consulta: string }) {
  const theme = useTheme();
  return (
    <Link
      href={{
        pathname: '/lector/[id]',
        params: { id: resultado.bookId, pagina: String(resultado.numero), q: consulta },
      }}
      asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.resultado,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
        ]}>
        <View style={styles.fila}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.espacio}>
            {resultado.titulo ?? resultado.bookId}
          </ThemedText>
          <ThemedText type="caption" themeColor="tint">
            Pág. {resultado.numero}
          </ThemedText>
        </View>
        <TextoResaltado texto={resultado.fragmento} consulta={consulta} style={styles.fragmento} />
      </Pressable>
    </Link>
  );
}

type ConsultaPaginada = {
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isPlaceholderData: boolean;
  hasNextPage: boolean;
  error: unknown;
  refetch: () => unknown;
  fetchNextPage: () => unknown;
};

function Resumen({ consulta, cantidad, unidad }: { consulta: ConsultaPaginada; cantidad: number; unidad: string }) {
  if (consulta.isPending || cantidad === 0) return null;
  return (
    <View style={styles.fila}>
      <ThemedText type="caption" themeColor="textSecondary">
        {cantidad} {unidad}
        {consulta.hasNextPage ? ' (hay más al bajar)' : ''}
      </ThemedText>
      {consulta.isFetching && !consulta.isFetchingNextPage && <ActivityIndicator size="small" />}
    </View>
  );
}

function Estado({ consulta, vacio }: { consulta: ConsultaPaginada; vacio: React.ReactElement }) {
  if (consulta.isPending) return <Cargando texto="Buscando…" />;
  if (consulta.isError) return <MensajeError error={consulta.error} onReintentar={() => consulta.refetch()} />;
  if (consulta.isPlaceholderData) return <Cargando texto="Buscando…" />;
  return vacio;
}

/** Al final de la lista: indicador de la página siguiente, o el error si falló al traerla. */
function Pie({ consulta, hay }: { consulta: ConsultaPaginada; hay: boolean }) {
  if (!hay) return null;
  if (consulta.isFetchingNextPage) return <Cargando texto="Cargando más…" />;
  if (consulta.isError)
    return <MensajeError error={consulta.error} onReintentar={() => consulta.fetchNextPage()} compacto />;
  if (!consulta.hasNextPage)
    return (
      <ThemedText type="caption" themeColor="textSecondary" style={styles.fin}>
        No hay más resultados
      </ThemedText>
    );
  return null;
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    alignItems: 'center',
  },
  columna: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  lista: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    flexGrow: 1,
  },
  cabeceraLista: {
    gap: Spacing.three,
  },
  encabezado: {
    gap: Spacing.three,
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  entrada: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.two,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  espacio: {
    flex: 1,
  },
  botonFiltros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
  },
  resultado: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  fragmento: {
    fontSize: 15,
    lineHeight: 22,
  },
  fin: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
});

/**
 * Visor del texto indexado de un libro, página por página.
 * - `pagina`: página con la que abre (1 si no se indica).
 * - `q`: palabras a resaltar (vienen de un resultado de búsqueda).
 * - `buscar`: abre primero la lista de páginas del libro que contienen esas palabras.
 */

import { Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/components/controles';
import { Cargando, MensajeError, Vacio } from '@/components/estados';
import { Icono } from '@/components/icono';
import { useMargen } from '@/components/pantalla';
import { TextoResaltado } from '@/components/resaltado';
import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxReadingWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAjustes } from '@/lib/ajustes';
import { SIN_FILTROS } from '@/lib/api';
import { useBusquedaEnTexto, useLibro, usePagina } from '@/lib/consultas';

export default function Lector() {
  const params = useLocalSearchParams<{ id: string; pagina?: string; q?: string; buscar?: string }>();
  const libro = useLibro(params.id);
  const paginaPedida = Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1);
  const [pagina, setPagina] = useState(paginaPedida);
  const [resaltar, setResaltar] = useState(params.q ?? params.buscar ?? '');
  const [verResultados, setVerResultados] = useState(!!params.buscar);

  // Los parámetros pueden llegar después del primer render (en la web) o cambiar
  // si se abre otro resultado: en ese caso el visor los vuelve a tomar.
  const clave = `${params.pagina}|${params.q}|${params.buscar}`;
  const [claveAnterior, setClaveAnterior] = useState(clave);
  if (clave !== claveAnterior) {
    setClaveAnterior(clave);
    setPagina(paginaPedida);
    setResaltar(params.q ?? params.buscar ?? '');
    setVerResultados(!!params.buscar);
  }

  if (libro.isPending) return <Cargando texto="Abriendo libro…" />;
  if (libro.isError) return <MensajeError error={libro.error} onReintentar={() => libro.refetch()} />;

  const total = libro.data.numPaginas ?? null;
  const titulo = libro.data.titulo;

  if (verResultados && params.buscar) {
    return (
      <ResultadosEnLibro
        libroId={params.id}
        titulo={titulo}
        consulta={params.buscar}
        idioma={libro.data.idioma ?? 'es'}
        onElegir={(n) => {
          setPagina(n);
          setResaltar(params.buscar ?? '');
          setVerResultados(false);
        }}
      />
    );
  }

  return (
    <Visor
      libroId={params.id}
      titulo={titulo}
      pagina={pagina}
      total={total}
      resaltar={resaltar}
      onIr={setPagina}
      onVolverAResultados={params.buscar ? () => setVerResultados(true) : undefined}
    />
  );
}

type VisorProps = {
  libroId: string;
  titulo: string;
  pagina: number;
  total: number | null;
  resaltar: string;
  onIr: (pagina: number) => void;
  onVolverAResultados?: () => void;
};

function Visor({ libroId, titulo, pagina, total, resaltar, onIr, onVolverAResultados }: VisorProps) {
  const theme = useTheme();
  const margen = useMargen();
  const insets = useSafeAreaInsets();
  const { letra, cambiarLetra, puedeAchicar, puedeAgrandar } = useAjustes();
  const consulta = usePagina(libroId, pagina, total);
  const desplazamiento = useRef<ScrollView>(null);
  const [saltoA, setSaltoA] = useState('');

  const ir = (destino: number) => {
    const n = Math.max(1, total ? Math.min(total, destino) : destino);
    if (n === pagina) return;
    onIr(n);
    desplazamiento.current?.scrollTo({ y: 0, animated: false });
  };

  const saltar = () => {
    const n = Number.parseInt(saltoA, 10);
    if (Number.isFinite(n)) ir(n);
    setSaltoA('');
  };

  return (
    <View style={[styles.pantalla, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: titulo }} />

      <ScrollView
        ref={desplazamiento}
        contentContainerStyle={[styles.contenido, { paddingHorizontal: margen }]}>
        <View style={styles.columna}>
          <View style={styles.filaHerramientas}>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.flexible}>
              Página {pagina}
              {total ? ` de ${total}` : ''}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Letra más pequeña"
              disabled={!puedeAchicar}
              onPress={() => cambiarLetra(-1)}
              style={[styles.botonLetra, { borderColor: theme.border, opacity: puedeAchicar ? 1 : 0.4 }]}>
              <ThemedText type="smallBold">A−</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Letra más grande"
              disabled={!puedeAgrandar}
              onPress={() => cambiarLetra(1)}
              style={[styles.botonLetra, { borderColor: theme.border, opacity: puedeAgrandar ? 1 : 0.4 }]}>
              <ThemedText type="smallBold">A+</ThemedText>
            </Pressable>
          </View>

          {onVolverAResultados && (
            <Boton titulo="Volver a los resultados" variante="secundario" icono="buscar" onPress={onVolverAResultados} />
          )}

          {consulta.isPending ? (
            <Cargando texto="Cargando página…" />
          ) : consulta.isError ? (
            <MensajeError error={consulta.error} onReintentar={() => consulta.refetch()} />
          ) : consulta.data.texto.trim() ? (
            <TextoResaltado
              texto={consulta.data.texto}
              consulta={resaltar}
              style={{ fontFamily: Fonts?.serif, fontSize: letra, lineHeight: Math.round(letra * 1.6) }}
            />
          ) : (
            <Vacio titulo="Página sin texto" texto="Esta página no tiene texto reconocido (puede ser una imagen o estar en blanco)." />
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.barra,
          { borderTopColor: theme.border, backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.two },
        ]}>
        <Boton titulo="Anterior" icono="anterior" variante="secundario" deshabilitado={pagina <= 1} onPress={() => ir(pagina - 1)} />
        <TextInput
          accessibilityLabel="Ir a la página"
          value={saltoA}
          onChangeText={(t) => setSaltoA(t.replace(/\D/g, '').slice(0, 4))}
          onSubmitEditing={saltar}
          placeholder={String(pagina)}
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          returnKeyType="go"
          style={[styles.salto, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
        />
        <Boton
          titulo="Siguiente"
          icono="siguiente"
          iconoAlFinal
          variante="secundario"
          deshabilitado={total !== null && pagina >= total}
          onPress={() => ir(pagina + 1)}
        />
      </View>
    </View>
  );
}

type ResultadosProps = {
  libroId: string;
  titulo: string;
  consulta: string;
  idioma: 'es' | 'en';
  onElegir: (pagina: number) => void;
};

function ResultadosEnLibro({ libroId, titulo, consulta, idioma, onElegir }: ResultadosProps) {
  const theme = useTheme();
  const margen = useMargen();
  const busqueda = useBusquedaEnTexto(consulta, { ...SIN_FILTROS, idioma }, libroId);
  const resultados = busqueda.data?.pages.flatMap((p) => p.resultados) ?? [];

  return (
    <View style={[styles.pantalla, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: titulo }} />
      <FlatList
        data={resultados}
        keyExtractor={(r) => String(r.numero)}
        contentContainerStyle={[styles.lista, { paddingHorizontal: margen }]}
        ListHeaderComponent={
          <ThemedText type="heading">
            Páginas con «{consulta}»{resultados.length ? ` (${resultados.length}${busqueda.hasNextPage ? '+' : ''})` : ''}
          </ThemedText>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => onElegir(item.numero)}
            style={({ pressed }) => [
              styles.resultado,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
            ]}>
            <View style={styles.filaHerramientas}>
              <ThemedText type="smallBold" themeColor="tint" style={styles.flexible}>
                Página {item.numero}
              </ThemedText>
              <Icono nombre="siguiente" color="textSecondary" size={18} />
            </View>
            <TextoResaltado texto={item.fragmento} consulta={consulta} style={styles.fragmento} />
          </Pressable>
        )}
        ListEmptyComponent={
          busqueda.isPending ? (
            <Cargando texto="Buscando en el libro…" />
          ) : busqueda.isError ? (
            <MensajeError error={busqueda.error} onReintentar={() => busqueda.refetch()} />
          ) : (
            <Vacio icono="buscar" titulo="Sin coincidencias" texto="Ninguna página de este libro contiene esas palabras." />
          )
        }
        ListFooterComponent={
          busqueda.isFetchingNextPage ? <Cargando texto="Cargando más…" /> : null
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (busqueda.hasNextPage && !busqueda.isFetchingNextPage && !busqueda.isError) busqueda.fetchNextPage();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  contenido: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingBottom: Spacing.five,
    flexGrow: 1,
  },
  columna: {
    width: '100%',
    maxWidth: MaxReadingWidth,
    gap: Spacing.three,
  },
  filaHerramientas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flexible: {
    flex: 1,
  },
  botonLetra: {
    minWidth: 44,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.small,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  salto: {
    width: 64,
    minHeight: 44,
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: Radius.small,
    fontSize: 16,
  },
  lista: {
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    width: '100%',
    maxWidth: MaxReadingWidth,
    alignSelf: 'center',
    flexGrow: 1,
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
});

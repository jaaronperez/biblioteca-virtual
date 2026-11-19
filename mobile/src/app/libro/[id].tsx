import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { Boton } from '@/components/controles';
import { Cargando, MensajeError } from '@/components/estados';
import { Icono } from '@/components/icono';
import { Pantalla } from '@/components/pantalla';
import { Portada } from '@/components/portada';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAjustes } from '@/lib/ajustes';
import { api, mensajeDeError, type LibroDetalle } from '@/lib/api';

import { useLibro } from '@/lib/consultas';

/** Si el libro no trae descripción, se arma una básica con sus datos (ver modelo-datos.md). */
function descripcionDe(libro: LibroDetalle): string {
  if (libro.descripcion?.trim()) return libro.descripcion.trim();
  const partes = [
    libro.tipo ? `${libro.tipo}` : 'Libro',
    libro.autor ? `de ${libro.autor}` : null,
    libro.fecha ? `publicado en ${libro.fecha}` : null,
  ].filter(Boolean);
  const paginas = libro.numPaginas ? ` Tiene ${libro.numPaginas} páginas digitalizadas.` : '';
  const idioma = libro.idioma === 'en' ? ' Está en inglés.' : libro.idioma === 'es' ? ' Está en español.' : '';
  return `${partes.join(', ')}.${paginas}${idioma}`;
}

export default function DetalleLibro() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { urlApi } = useAjustes();
  const { width } = useWindowDimensions();
  const libro = useLibro(id);
  const [abriendo, setAbriendo] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);
  const [buscar, setBuscar] = useState('');

  if (libro.isPending) return <Cargando texto="Cargando libro…" />;
  if (libro.isError) return <MensajeError error={libro.error} onReintentar={() => libro.refetch()} />;

  const datos = libro.data;
  const ancho = width >= 600;
  const procesado = datos.estado === 'procesado';

  const abrirPdf = async () => {
    setAbriendo(true);
    setErrorPdf(null);
    try {
      // La API firma un enlace temporal (SAS de 15 minutos): el contenedor de PDF es privado
      const { url } = await api.pdf(urlApi, datos.id);
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      setErrorPdf(mensajeDeError(error));
    } finally {
      setAbriendo(false);
    }
  };

  const buscarAqui = () => {
    if (buscar.trim().length < 2) return;
    router.push({ pathname: '/lector/[id]', params: { id: datos.id, buscar: buscar.trim() } });
  };

  const fichas: [string, string | null | undefined][] = [
    ['Autor', datos.autor],
    ['Iglesia', datos.iglesia],
    ['Tipo', datos.tipo],
    ['Fecha', datos.fecha],
    ['Idioma', datos.idioma === 'en' ? 'Inglés' : datos.idioma === 'es' ? 'Español' : null],
    ['Páginas', datos.numPaginas ? String(datos.numPaginas) : null],
    ['Identificador', datos.id],
  ];

  return (
    <Pantalla>
      <Stack.Screen options={{ title: datos.titulo }} />
      <View style={[styles.cabecera, ancho && styles.cabeceraAncha]}>
        <View style={ancho ? styles.portadaAncha : styles.portadaAngosta}>
          <Portada libro={datos} />
        </View>
        <View style={styles.datos}>
          <ThemedText type="title">{datos.titulo}</ThemedText>
          {!!datos.autor && <ThemedText themeColor="textSecondary">{datos.autor}</ThemedText>}
          <ThemedText>{descripcionDe(datos)}</ThemedText>
          <View style={styles.botones}>
            <Boton
              titulo="Leer texto"
              icono="libro"
              deshabilitado={!procesado}
              onPress={() => router.push({ pathname: '/lector/[id]', params: { id: datos.id, pagina: '1' } })}
            />
            <Boton
              titulo={abriendo ? 'Abriendo…' : 'Ver PDF'}
              icono="pdf"
              variante="secundario"
              deshabilitado={abriendo}
              onPress={abrirPdf}
            />
          </View>
          {!procesado && (
            <ThemedText type="small" themeColor="warning">
              El texto de este libro todavía se está procesando.
            </ThemedText>
          )}
          {errorPdf && (
            <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
              No se pudo abrir el PDF. {errorPdf}
            </ThemedText>
          )}
        </View>
      </View>

      {procesado && (
        <View style={[styles.caja, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="heading">Buscar en este libro</ThemedText>
          <View style={[styles.campo, { borderColor: theme.border, backgroundColor: theme.background }]}>
            <Icono nombre="buscar" color="textSecondary" size={20} />
            <TextInput
              accessibilityLabel="Buscar en este libro"
              value={buscar}
              onChangeText={setBuscar}
              onSubmitEditing={buscarAqui}
              placeholder="Una palabra…"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="search"
              style={[styles.entrada, { color: theme.text }]}
            />
          </View>
          <Boton titulo="Buscar" variante="secundario" deshabilitado={buscar.trim().length < 2} onPress={buscarAqui} />
        </View>
      )}

      {!!datos.capitulos?.length && (
        <View style={[styles.caja, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="heading">Capítulos</ThemedText>
          {datos.capitulos.map((cap, i) => (
            <Boton
              key={i}
              variante="secundario"
              titulo={`${cap.titulo ?? `Capítulo ${i + 1}`}${cap.paginaInicial ? ` · pág. ${cap.paginaInicial}` : ''}`}
              onPress={() =>
                router.push({
                  pathname: '/lector/[id]',
                  params: { id: datos.id, pagina: String(cap.paginaInicial ?? 1) },
                })
              }
            />
          ))}
        </View>
      )}

      <View style={[styles.caja, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="heading">Ficha</ThemedText>
        {fichas
          .filter(([, valor]) => !!valor)
          .map(([etiqueta, valor]) => (
            <View key={etiqueta} style={[styles.ficha, { borderBottomColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {etiqueta}
              </ThemedText>
              <ThemedText type="small" style={styles.valor}>
                {valor}
              </ThemedText>
            </View>
          ))}
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  cabecera: {
    gap: Spacing.four,
    alignItems: 'center',
  },
  cabeceraAncha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  portadaAngosta: {
    width: 180,
  },
  portadaAncha: {
    width: 220,
  },
  datos: {
    flex: 1,
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  botones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  caja: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  entrada: {
    flex: 1,
    fontSize: 16,
  },
  ficha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  valor: {
    flexShrink: 1,
    textAlign: 'right',
  },
});

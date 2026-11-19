/**
 * Panel de administración: avance de la digitalización por integrante frente a su
 * meta, contado en Cosmos DB y actualizado cada 15 segundos, más una prueba de
 * peticiones concurrentes que muestra que el backend reutiliza un solo cliente.
 */

import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { BarraProgreso, Boton } from '@/components/controles';
import { Cargando, MensajeError } from '@/components/estados';
import { Icono } from '@/components/icono';
import { Pantalla } from '@/components/pantalla';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAjustes } from '@/lib/ajustes';
import { api, mensajeDeError, type AvanceIntegrante } from '@/lib/api';
import { useProgreso } from '@/lib/consultas';

const formato = (n: number) => n.toLocaleString('es-MX');
const porcentaje = (valor: number, meta: number) =>
  meta > 0 ? `${((valor / meta) * 100).toLocaleString('es-MX', { maximumFractionDigits: 1 })} %` : '—';

export default function Admin() {
  const progreso = useProgreso();
  const { width } = useWindowDimensions();

  if (progreso.isPending) return <Cargando texto="Cargando avance del equipo…" />;
  if (progreso.isError && !progreso.data)
    return <MensajeError error={progreso.error} onReintentar={() => progreso.refetch()} />;

  const { total, equipo, actualizado, sinBloque } = progreso.data;
  const columnas = width >= 900 ? 4 : width >= 520 ? 2 : 1;

  return (
    <Pantalla>
      <View style={styles.filaTitulo}>
        <ThemedText type="subtitle" style={styles.flexible}>
          Avance de la digitalización
        </ThemedText>
        <EnVivo actualizando={progreso.isFetching} fallo={progreso.isError} actualizado={actualizado} />
      </View>

      {progreso.isError && (
        <MensajeError error={progreso.error} onReintentar={() => progreso.refetch()} compacto />
      )}

      <View style={styles.indicadores}>
        <Indicador titulo="Libros en la nube" valor={formato(total.subidos)} detalle={`de ${formato(total.meta)}`} />
        <Indicador titulo="Avance total" valor={porcentaje(total.subidos, total.meta)} detalle="de la meta" />
        <Indicador titulo="Con texto listo" valor={formato(total.procesados)} detalle="procesados" />
        <Indicador titulo="Páginas" valor={formato(total.paginas)} detalle="indexadas" />
      </View>

      <Tarjeta>
        <ThemedText type="heading">Meta acumulada del equipo</ThemedText>
        <BarraProgreso valor={total.subidos} meta={total.meta} alto={14} />
        <ThemedText type="small" themeColor="textSecondary">
          {formato(total.subidos)} de {formato(total.meta)} libros · faltan {formato(total.meta - total.subidos)}
          {total.conError ? ` · ${total.conError} con error` : ''}
        </ThemedText>
      </Tarjeta>

      <ThemedText type="subtitle">Por integrante</ThemedText>
      <View style={styles.rejilla}>
        {equipo.map((integrante) => (
          <View key={integrante.nombre} style={{ width: columnas === 1 ? '100%' : `${100 / columnas - 2}%` }}>
            <TarjetaIntegrante integrante={integrante} maximo={Math.max(...equipo.map((e) => e.subidos), 1)} />
          </View>
        ))}
      </View>
      {sinBloque > 0 && (
        <ThemedText type="caption" themeColor="warning">
          {sinBloque} libros tienen un ID fuera de los bloques del equipo.
        </ThemedText>
      )}

      <PruebaConexiones />

      <ThemedText type="caption" themeColor="textSecondary">
        Los datos salen de Cosmos DB: cuentan los libros ya subidos a Azure. Los que siguen en escaneo solo
        aparecen en la hoja de registro.
      </ThemedText>
    </Pantalla>
  );
}

function EnVivo({ actualizando, fallo, actualizado }: { actualizando: boolean; fallo: boolean; actualizado: string }) {
  const theme = useTheme();
  const hora = new Date(actualizado).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <View style={styles.enVivo} accessibilityLiveRegion="polite">
      <View style={[styles.punto, { backgroundColor: fallo ? theme.danger : theme.success }]} />
      <ThemedText type="caption" themeColor="textSecondary">
        {actualizando ? 'Actualizando…' : `En vivo · ${hora}`}
      </ThemedText>
    </View>
  );
}

function Tarjeta({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.tarjeta, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {children}
    </View>
  );
}

function Indicador({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.indicador, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="caption" themeColor="textSecondary">
        {titulo}
      </ThemedText>
      <ThemedText type="subtitle">{valor}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {detalle}
      </ThemedText>
    </View>
  );
}

function TarjetaIntegrante({ integrante, maximo }: { integrante: AvanceIntegrante; maximo: number }) {
  const lider = integrante.subidos > 0 && integrante.subidos === maximo;
  return (
    <Tarjeta>
      <View style={styles.filaTitulo}>
        <ThemedText type="heading" numberOfLines={2} style={styles.flexible}>
          {integrante.nombre}
        </ThemedText>
        <ThemedText type="smallBold" themeColor={lider ? 'tint' : 'textSecondary'}>
          {porcentaje(integrante.subidos, integrante.meta)}
        </ThemedText>
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        Bloque {integrante.desde} a {integrante.hasta}
      </ThemedText>
      <BarraProgreso valor={integrante.subidos} meta={integrante.meta} color={lider ? 'tint' : 'success'} />
      <ThemedText type="small">
        {formato(integrante.subidos)} de {formato(integrante.meta)} libros · {formato(integrante.paginas)} páginas
      </ThemedText>
      {integrante.conError > 0 && (
        <ThemedText type="caption" themeColor="danger">
          {integrante.conError} con error de procesamiento
        </ThemedText>
      )}
    </Tarjeta>
  );
}

type ResultadoPrueba = {
  peticiones: number;
  exitosas: number;
  instancias: string[];
  procesos: number[];
  milisegundos: number;
  error?: string;
};

const PETICIONES_CONCURRENTES = 20;

/**
 * Lanza 20 peticiones a `/salud` al mismo tiempo. Cada respuesta trae el
 * identificador del cliente de Cosmos que la atendió: si todas coinciden, el
 * backend reutilizó una sola conexión (patrón Singleton) en lugar de abrir una por petición.
 */
function PruebaConexiones() {
  const { urlApi } = useAjustes();
  const [corriendo, setCorriendo] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPrueba | null>(null);

  const probar = async () => {
    setCorriendo(true);
    const inicio = Date.now();
    const respuestas = await Promise.allSettled(
      Array.from({ length: PETICIONES_CONCURRENTES }, () => api.salud(urlApi)),
    );
    const exitosas = respuestas.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    const fallida = respuestas.find((r) => r.status === 'rejected');
    setResultado({
      peticiones: respuestas.length,
      exitosas: exitosas.length,
      instancias: [...new Set(exitosas.map((s) => s.conexion.instancia))],
      procesos: [...new Set(exitosas.map((s) => s.conexion.proceso))],
      milisegundos: Date.now() - inicio,
      error: fallida?.status === 'rejected' ? mensajeDeError(fallida.reason) : undefined,
    });
    setCorriendo(false);
  };

  const unica = resultado && resultado.exitosas > 0 && resultado.instancias.length === resultado.procesos.length;

  return (
    <Tarjeta>
      <View style={styles.filaTitulo}>
        <Icono nombre="actualizar" color="tint" />
        <ThemedText type="heading" style={styles.flexible}>
          Prueba de conexiones concurrentes
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Envía {PETICIONES_CONCURRENTES} peticiones al mismo tiempo y revisa qué cliente de Cosmos DB atendió cada
        una.
      </ThemedText>
      <Boton
        titulo={corriendo ? 'Enviando…' : `Enviar ${PETICIONES_CONCURRENTES} peticiones`}
        deshabilitado={corriendo}
        onPress={probar}
      />
      {resultado && (
        <View style={styles.resultadoPrueba} accessibilityLiveRegion="polite">
          <ThemedText type="small">
            {resultado.exitosas} de {resultado.peticiones} respondieron en {formato(resultado.milisegundos)} ms.
          </ThemedText>
          {resultado.exitosas > 0 && (
            <ThemedText type="small" themeColor={unica ? 'success' : 'warning'}>
              {unica
                ? `Todas usaron el mismo cliente (instancia ${resultado.instancias[0]}): no se abrieron conexiones nuevas.`
                : `Respondieron ${resultado.instancias.length} clientes en ${resultado.procesos.length} procesos del servidor.`}
            </ThemedText>
          )}
          {resultado.error && (
            <ThemedText type="small" themeColor="danger">
              Algunas fallaron: {resultado.error}
            </ThemedText>
          )}
        </View>
      )}
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flexible: {
    flex: 1,
  },
  enVivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicadores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  indicador: {
    flexGrow: 1,
    flexBasis: 140,
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  tarjeta: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.three,
  },
  resultadoPrueba: {
    gap: Spacing.one,
  },
});

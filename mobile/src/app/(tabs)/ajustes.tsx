import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Boton } from '@/components/controles';
import { Icono } from '@/components/icono';
import { Pantalla } from '@/components/pantalla';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAjustes } from '@/lib/ajustes';
import { mensajeDeError, urlApiPorDefecto } from '@/lib/api';
import { useSalud } from '@/lib/consultas';

export default function Ajustes() {
  const theme = useTheme();
  const router = useRouter();
  const ajustes = useAjustes();
  const salud = useSalud();
  const [url, setUrl] = useState(ajustes.urlPersonalizada ? ajustes.urlApi : '');

  return (
    <Pantalla>
      <Seccion titulo="Lectura">
        <ThemedText type="small" themeColor="textSecondary">
          Tamaño de la letra en el visor de páginas.
        </ThemedText>
        <View style={styles.fila}>
          <Boton
            titulo="A−"
            variante="secundario"
            deshabilitado={!ajustes.puedeAchicar}
            onPress={() => ajustes.cambiarLetra(-1)}
          />
          <ThemedText style={[styles.muestra, { fontSize: ajustes.letra, lineHeight: ajustes.letra * 1.5 }]}>
            Bienaventurados los mansos
          </ThemedText>
          <Boton
            titulo="A+"
            variante="secundario"
            deshabilitado={!ajustes.puedeAgrandar}
            onPress={() => ajustes.cambiarLetra(1)}
          />
        </View>
      </Seccion>

      <Seccion titulo="Conexión con el servidor">
        <View style={styles.filaIcono}>
          <Icono
            nombre={salud.isSuccess ? 'listo' : 'sinConexion'}
            color={salud.isSuccess ? 'success' : salud.isError ? 'danger' : 'textSecondary'}
          />
          <ThemedText type="small" style={styles.flexible}>
            {salud.isPending
              ? 'Comprobando…'
              : salud.isError
                ? mensajeDeError(salud.error)
                : `Conectado a Cosmos DB (base «${salud.data.baseDeDatos}», ${salud.data.libros} libros).`}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Dirección de la API. Déjala vacía para usar la automática ({urlApiPorDefecto()}).
        </ThemedText>
        <TextInput
          accessibilityLabel="Dirección de la API"
          value={url}
          onChangeText={setUrl}
          placeholder={urlApiPorDefecto()}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={[styles.entrada, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        />
        <View style={styles.fila}>
          <Boton titulo="Guardar y probar" onPress={() => ajustes.cambiarUrlApi(url)} />
          <Boton titulo="Probar de nuevo" variante="secundario" icono="actualizar" onPress={() => salud.refetch()} />
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          En uso: {ajustes.urlApi}
        </ThemedText>
      </Seccion>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/admin')}
        style={({ pressed }) => [
          styles.seccion,
          styles.enlace,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
        ]}>
        <Icono nombre="grafica" color="tint" />
        <View style={styles.flexible}>
          <ThemedText type="heading">Panel de administración</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Avance de la digitalización por integrante y prueba de conexiones.
          </ThemedText>
        </View>
        <Icono nombre="siguiente" color="textSecondary" />
      </Pressable>

      <ThemedText type="caption" themeColor="textSecondary" style={styles.centrado}>
        Biblioteca Virtual Eclesiástica · Universidad Tecnológica Metropolitana
      </ThemedText>
    </Pantalla>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.seccion, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="heading">{titulo}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  enlace: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filaIcono: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flexible: {
    flex: 1,
  },
  muestra: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'serif',
  },
  entrada: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
    fontSize: 16,
  },
  centrado: {
    textAlign: 'center',
  },
});

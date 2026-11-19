/**
 * Filtros del buscador. Las opciones de iglesia, tipo e idioma salen de `/filtros`,
 * es decir, de los valores que existen hoy en Cosmos DB.
 */

import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Boton, Chip } from '@/components/controles';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { contarFiltros, type Filtros, type Idioma } from '@/lib/api';
import { useFiltrosDisponibles } from '@/lib/consultas';

const NOMBRE_IDIOMA: Record<Idioma, string> = { es: 'Español', en: 'Inglés' };

type Props = {
  filtros: Filtros;
  onCambiar: (cambios: Partial<Filtros>) => void;
  onLimpiar: () => void;
};

export function PanelFiltros({ filtros, onCambiar, onLimpiar }: Props) {
  const theme = useTheme();
  const disponibles = useFiltrosDisponibles();
  const opciones = disponibles.data;

  return (
    <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Grupo titulo="Iglesia de origen">
        <FilaChips
          valores={opciones?.iglesias ?? []}
          elegido={filtros.iglesia}
          onElegir={(iglesia) => onCambiar({ iglesia })}
        />
      </Grupo>

      <Grupo titulo="Tipo de libro">
        <FilaChips
          valores={opciones?.tipos ?? []}
          elegido={filtros.tipo}
          onElegir={(tipo) => onCambiar({ tipo })}
        />
      </Grupo>

      <Grupo titulo="Idioma">
        <FilaChips
          valores={(['es', 'en'] as const).filter((i) => !opciones || opciones.idiomas.includes(i) || filtros.idioma === i)}
          etiqueta={(i) => NOMBRE_IDIOMA[i]}
          elegido={filtros.idioma}
          onElegir={(idioma) => onCambiar({ idioma })}
        />
      </Grupo>

      <Grupo titulo="Fecha (años)">
        <View style={styles.anios}>
          <CampoAnio
            etiqueta="Desde"
            valor={filtros.anioDesde}
            sugerencia={opciones?.anioDesde}
            onCambiar={(anioDesde) => onCambiar({ anioDesde })}
          />
          <ThemedText themeColor="textSecondary">a</ThemedText>
          <CampoAnio
            etiqueta="Hasta"
            valor={filtros.anioHasta}
            sugerencia={opciones?.anioHasta}
            onCambiar={(anioHasta) => onCambiar({ anioHasta })}
          />
        </View>
      </Grupo>

      {disponibles.isError && (
        <ThemedText type="caption" themeColor="danger">
          No se pudieron cargar las opciones de los filtros. Se reintentará al volver la conexión.
        </ThemedText>
      )}

      {contarFiltros(filtros) > 0 && (
        <Boton titulo="Quitar filtros" variante="secundario" icono="cerrar" onPress={onLimpiar} />
      )}
    </View>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.grupo}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {titulo}
      </ThemedText>
      {children}
    </View>
  );
}

type FilaChipsProps<T extends string> = {
  valores: readonly T[];
  elegido: T | null;
  onElegir: (valor: T | null) => void;
  etiqueta?: (valor: T) => string;
};

function FilaChips<T extends string>({ valores, elegido, onElegir, etiqueta }: FilaChipsProps<T>) {
  if (valores.length === 0) {
    return (
      <ThemedText type="caption" themeColor="textSecondary">
        Cargando opciones…
      </ThemedText>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      <Chip titulo="Todos" activo={elegido === null} onPress={() => onElegir(null)} />
      {valores.map((valor) => (
        <Chip
          key={valor}
          titulo={etiqueta ? etiqueta(valor) : valor}
          activo={elegido === valor}
          onPress={() => onElegir(elegido === valor ? null : valor)}
        />
      ))}
    </ScrollView>
  );
}

type CampoAnioProps = {
  etiqueta: string;
  valor: number | null;
  sugerencia?: number | null;
  onCambiar: (valor: number | null) => void;
};

/** Año de 1 a 4 cifras. Mientras se escribe no se consulta: el valor se aplica al terminar. */
function CampoAnio({ etiqueta, valor, sugerencia, onCambiar }: CampoAnioProps) {
  const theme = useTheme();
  const [texto, setTexto] = useState(valor === null ? '' : String(valor));
  const [anterior, setAnterior] = useState(valor);
  if (valor !== anterior) {
    // Los filtros cambiaron desde fuera (por ejemplo, «Quitar filtros»)
    setAnterior(valor);
    setTexto(valor === null ? '' : String(valor));
  }

  const aplicar = () => {
    const numero = Number.parseInt(texto, 10);
    onCambiar(Number.isFinite(numero) && numero >= 0 && numero <= 2100 ? numero : null);
  };

  return (
    <TextInput
      accessibilityLabel={`Año ${etiqueta.toLowerCase()}`}
      value={texto}
      onChangeText={(t) => setTexto(t.replace(/\D/g, '').slice(0, 4))}
      onEndEditing={aplicar}
      onBlur={aplicar}
      onSubmitEditing={aplicar}
      keyboardType="number-pad"
      returnKeyType="done"
      maxLength={4}
      placeholder={sugerencia ? `${etiqueta} (${sugerencia})` : etiqueta}
      placeholderTextColor={theme.textSecondary}
      style={[styles.anio, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
    />
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  grupo: {
    gap: Spacing.two,
  },
  chips: {
    gap: Spacing.two,
    paddingRight: Spacing.two,
  },
  anios: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  anio: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
    fontSize: 16,
  },
});

import { Text, type TextStyle, type StyleProp } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Minúsculas y sin acentos, para comparar como lo hace el buscador. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Raíz aproximada de cada término. Cosmos busca por raíz (con «bautismo»
 * encuentra «bautismos»), así que se resalta toda palabra que empiece igual.
 */
function raices(consulta: string): string[] {
  return consulta
    .split(/\s+/)
    .map(normalizar)
    .filter((t) => t.length >= 2)
    .map((t) => (t.length > 5 ? t.slice(0, t.length - 2) : t));
}

type Props = { texto: string; consulta?: string; style?: StyleProp<TextStyle> };

/** Texto con las palabras de la búsqueda resaltadas. */
export function TextoResaltado({ texto, consulta, style }: Props) {
  const theme = useTheme();
  const buscadas = consulta ? raices(consulta) : [];
  if (buscadas.length === 0) return <Text style={[{ color: theme.text }, style]}>{texto}</Text>;

  // Separa en palabras y en lo que hay entre ellas, conservando todo el texto
  const trozos = texto.split(/([\p{L}\p{N}]+)/u);
  return (
    <Text style={[{ color: theme.text }, style]}>
      {trozos.map((trozo, i) => {
        const esPalabra = i % 2 === 1;
        if (esPalabra && buscadas.some((raiz) => normalizar(trozo).startsWith(raiz))) {
          return (
            <Text key={i} style={{ backgroundColor: theme.highlight, fontWeight: 700 }}>
              {trozo}
            </Text>
          );
        }
        return trozo;
      })}
    </Text>
  );
}

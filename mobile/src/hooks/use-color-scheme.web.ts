import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const sinSuscripcion = () => () => {};

/**
 * En la web, la página se genera primero en el servidor (sin saber el tema del
 * navegador) y luego se hidrata. Hasta la hidratación se usa el tema claro, para
 * que el HTML del servidor y el del cliente coincidan.
 */
export function useColorScheme() {
  const hidratado = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
  const colorScheme = useRNColorScheme();
  return hidratado ? colorScheme : 'light';
}

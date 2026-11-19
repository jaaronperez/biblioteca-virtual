/**
 * Ajustes del usuario (tamaño de letra del lector y dirección del servidor).
 * Se guardan en el dispositivo con AsyncStorage y se comparten por contexto.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { limpiarUrl, urlApiPorDefecto } from '@/lib/api';

const CLAVE = 'biblioteca.ajustes.v1';

export const TAMANOS_LETRA = [15, 17, 19, 22, 25] as const;
const TAMANO_INICIAL = 1;

type Guardado = { urlApi: string | null; tamanoLetra: number };

type Ajustes = {
  /** Dirección de la API en uso (la escrita por el usuario o la automática). */
  urlApi: string;
  /** `true` si el usuario escribió una dirección distinta de la automática. */
  urlPersonalizada: boolean;
  cambiarUrlApi: (url: string | null) => void;
  /** Tamaño de letra del lector, en puntos. */
  letra: number;
  puedeAgrandar: boolean;
  puedeAchicar: boolean;
  cambiarLetra: (paso: 1 | -1) => void;
};

const Contexto = createContext<Ajustes | null>(null);

export function ProveedorAjustes({ children }: { children: ReactNode }) {
  const [guardado, setGuardado] = useState<Guardado>({ urlApi: null, tamanoLetra: TAMANO_INICIAL });

  useEffect(() => {
    let vigente = true;
    AsyncStorage.getItem(CLAVE)
      .then((texto) => {
        if (!texto || !vigente) return;
        const leido = JSON.parse(texto) as Partial<Guardado>;
        setGuardado({
          urlApi: typeof leido.urlApi === 'string' ? leido.urlApi : null,
          tamanoLetra: enRango(Number(leido.tamanoLetra ?? TAMANO_INICIAL)),
        });
      })
      .catch(() => {
        // Sin ajustes guardados (o ilegibles) se usan los valores por defecto
      });
    return () => {
      vigente = false;
    };
  }, []);

  const guardar = (nuevo: Guardado) => {
    setGuardado(nuevo);
    AsyncStorage.setItem(CLAVE, JSON.stringify(nuevo)).catch(() => {});
  };

  const valor: Ajustes = {
    urlApi: guardado.urlApi ?? urlApiPorDefecto(),
    urlPersonalizada: guardado.urlApi !== null,
    cambiarUrlApi: (url) => guardar({ ...guardado, urlApi: url?.trim() ? limpiarUrl(url) : null }),
    letra: TAMANOS_LETRA[guardado.tamanoLetra],
    puedeAgrandar: guardado.tamanoLetra < TAMANOS_LETRA.length - 1,
    puedeAchicar: guardado.tamanoLetra > 0,
    cambiarLetra: (paso) =>
      guardar({ ...guardado, tamanoLetra: enRango(guardado.tamanoLetra + paso) }),
  };

  return <Contexto value={valor}>{children}</Contexto>;
}

function enRango(indice: number): number {
  if (!Number.isInteger(indice)) return TAMANO_INICIAL;
  return Math.min(TAMANOS_LETRA.length - 1, Math.max(0, indice));
}

export function useAjustes(): Ajustes {
  const ajustes = use(Contexto);
  if (!ajustes) throw new Error('useAjustes se usa dentro de <ProveedorAjustes>');
  return ajustes;
}

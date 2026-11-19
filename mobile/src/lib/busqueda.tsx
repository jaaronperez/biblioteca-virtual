/**
 * Estado del buscador de la pestaña Biblioteca. Vive en un contexto para que
 * otras pantallas (Inicio) puedan abrir la Biblioteca con un filtro ya puesto.
 */

import { createContext, use, useState, type ReactNode } from 'react';

import { SIN_FILTROS, type Filtros } from '@/lib/api';

export type Modo = 'libros' | 'texto';

type Busqueda = {
  texto: string;
  cambiarTexto: (texto: string) => void;
  modo: Modo;
  cambiarModo: (modo: Modo) => void;
  filtros: Filtros;
  cambiarFiltros: (cambios: Partial<Filtros>) => void;
  /** Deja el buscador vacío y, si se indica, con unos filtros de partida. */
  reiniciar: (filtros?: Partial<Filtros>) => void;
};

const Contexto = createContext<Busqueda | null>(null);

export function ProveedorBusqueda({ children }: { children: ReactNode }) {
  const [texto, setTexto] = useState('');
  const [modo, setModo] = useState<Modo>('libros');
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);

  const valor: Busqueda = {
    texto,
    cambiarTexto: setTexto,
    modo,
    cambiarModo: setModo,
    filtros,
    cambiarFiltros: (cambios) => setFiltros((actuales) => ({ ...actuales, ...cambios })),
    reiniciar: (iniciales) => {
      setTexto('');
      setModo('libros');
      setFiltros({ ...SIN_FILTROS, ...iniciales });
    },
  };

  return <Contexto value={valor}>{children}</Contexto>;
}

export function useBusqueda(): Busqueda {
  const busqueda = use(Contexto);
  if (!busqueda) throw new Error('useBusqueda se usa dentro de <ProveedorBusqueda>');
  return busqueda;
}

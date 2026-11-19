/**
 * Consultas a la API con TanStack Query: caché, reintentos y paginación.
 * Cada hook incluye la dirección de la API en su clave, así que cambiar el
 * servidor en Ajustes vuelve a pedir los datos.
 */

import {
  keepPreviousData,
  QueryClient,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useAjustes } from '@/lib/ajustes';
import { api, ErrorApi, type Filtros } from '@/lib/api';

/** Libros por petición en la cuadrícula y resultados por petición en el texto. */
export const LIBROS_POR_PAGINA = 12;
export const RESULTADOS_POR_PAGINA = 15;

export function crearClienteDeConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // Un corte pasajero de red o de la nube se reintenta dos veces, con espera creciente.
        // Un 404 o una búsqueda inválida no se reintentan: fallarían igual.
        retry: (intentos, error) =>
          intentos < 2 && (!(error instanceof ErrorApi) || error.reintentable),
        retryDelay: (intento) => Math.min(1000 * 2 ** intento, 5000),
      },
    },
  });
}

/** Devuelve el valor solo cuando deja de cambiar, para no consultar en cada tecla. */
export function useValorPausado<T>(valor: T, esperaMs = 400): T {
  const [pausado, setPausado] = useState(valor);
  useEffect(() => {
    const reloj = setTimeout(() => setPausado(valor), esperaMs);
    return () => clearTimeout(reloj);
  }, [valor, esperaMs]);
  return pausado;
}

export function useSalud() {
  const { urlApi } = useAjustes();
  return useQuery({
    queryKey: [urlApi, 'salud'],
    queryFn: ({ signal }) => api.salud(urlApi, signal),
  });
}

export function useFiltrosDisponibles() {
  const { urlApi } = useAjustes();
  return useQuery({
    queryKey: [urlApi, 'filtros'],
    queryFn: ({ signal }) => api.filtros(urlApi, signal),
    staleTime: 5 * 60_000,
  });
}

/** Libros por metadatos, de a una página: `fetchNextPage` trae la siguiente. */
export function useLibros(titulo: string, filtros: Filtros) {
  const { urlApi } = useAjustes();
  return useInfiniteQuery({
    queryKey: [urlApi, 'libros', titulo, filtros],
    queryFn: ({ pageParam, signal }) =>
      api.libros(urlApi, { titulo, filtros, limite: LIBROS_POR_PAGINA, desde: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: (ultima) => (ultima.hayMas ? ultima.desde + ultima.cantidad : undefined),
    placeholderData: keepPreviousData,
  });
}

/** Búsqueda en el texto de las páginas, paginada. Con `libro`, solo dentro de ese libro. */
export function useBusquedaEnTexto(q: string, filtros?: Filtros, libro?: string) {
  const { urlApi } = useAjustes();
  const consulta = q.trim();
  return useInfiniteQuery({
    queryKey: [urlApi, 'buscar', consulta, filtros ?? null, libro ?? null],
    queryFn: ({ pageParam, signal }) =>
      api.buscarTexto(
        urlApi,
        { q: consulta, filtros, libro, limite: RESULTADOS_POR_PAGINA, desde: pageParam },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: (ultima) => (ultima.hayMas ? ultima.desde + ultima.cantidad : undefined),
    enabled: consulta.length >= 2,
    placeholderData: keepPreviousData,
  });
}

export function useLibro(id: string) {
  const { urlApi } = useAjustes();
  return useQuery({
    queryKey: [urlApi, 'libro', id],
    queryFn: ({ signal }) => api.libro(urlApi, id, signal),
  });
}

/** Texto de una página. Al llegar, deja pedida la siguiente para que pasar de página sea inmediato. */
export function usePagina(id: string, numero: number, total: number | null) {
  const { urlApi } = useAjustes();
  const cliente = useQueryClient();
  const consulta = useQuery({
    queryKey: [urlApi, 'pagina', id, numero],
    queryFn: ({ signal }) => api.pagina(urlApi, id, numero, signal),
    staleTime: Infinity,
  });

  const lista = consulta.isSuccess;
  useEffect(() => {
    if (!lista || total === null || numero >= total) return;
    cliente.prefetchQuery({
      queryKey: [urlApi, 'pagina', id, numero + 1],
      queryFn: ({ signal }) => api.pagina(urlApi, id, numero + 1, signal),
      staleTime: Infinity,
    });
  }, [lista, cliente, urlApi, id, numero, total]);

  return consulta;
}

/** Avance del equipo. Se vuelve a pedir cada 15 segundos mientras la pantalla está abierta. */
export function useProgreso() {
  const { urlApi } = useAjustes();
  return useQuery({
    queryKey: [urlApi, 'progreso'],
    queryFn: ({ signal }) => api.progreso(urlApi, signal),
    refetchInterval: 15_000,
    staleTime: 0,
  });
}

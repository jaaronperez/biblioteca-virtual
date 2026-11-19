/**
 * Cliente de la API del backend (FastAPI sobre Cosmos DB).
 *
 * Todas las pantallas pasan por `pedir`: una sola función que arma la URL, corta
 * la petición si tarda demasiado y convierte cualquier fallo en un `ErrorApi`
 * con un mensaje que se le puede mostrar al usuario.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PUERTO_API = 8000;
const TIEMPO_MAXIMO_MS = 15000;

/**
 * Dirección de la API cuando el usuario no escribió otra en Ajustes:
 * 1. `EXPO_PUBLIC_API_URL` (archivo `mobile/.env`), si existe.
 * 2. La misma computadora que sirve la app en desarrollo, en el puerto 8000.
 */
export function urlApiPorDefecto(): string {
  const deEntorno = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (deEntorno) return limpiarUrl(deEntorno);

  let equipo: string | undefined;
  if (Platform.OS === 'web') {
    equipo = typeof window === 'undefined' ? undefined : window.location.hostname;
  } else {
    // En Expo Go, `hostUri` es la IP de la computadora que corre `expo start`
    equipo = Constants.expoConfig?.hostUri?.split(':')[0];
  }
  return `http://${equipo || 'localhost'}:${PUERTO_API}`;
}

export function limpiarUrl(url: string): string {
  const limpia = url.trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(limpia) ? limpia : `http://${limpia}`;
}

export type TipoError = 'red' | 'tiempo' | 'nube' | 'noEncontrado' | 'peticion' | 'servidor';

const MENSAJES: Record<TipoError, string> = {
  red: 'No hay conexión con el servidor. Revisa tu internet y vuelve a intentarlo.',
  tiempo: 'El servidor tardó demasiado en responder. Vuelve a intentarlo.',
  nube: 'La base de datos en la nube no respondió. Vuelve a intentarlo en unos segundos.',
  noEncontrado: 'No se encontró lo que buscabas.',
  peticion: 'La búsqueda no es válida. Revisa los filtros.',
  servidor: 'El servidor tuvo un problema. Vuelve a intentarlo más tarde.',
};

export class ErrorApi extends Error {
  constructor(
    readonly tipo: TipoError,
    readonly estado?: number,
  ) {
    super(MENSAJES[tipo]);
    this.name = 'ErrorApi';
  }

  /** Los fallos pasajeros (red, nube) se reintentan solos; un 404 o un 422 no. */
  get reintentable(): boolean {
    return this.tipo !== 'noEncontrado' && this.tipo !== 'peticion';
  }
}

export function mensajeDeError(error: unknown): string {
  return error instanceof ErrorApi ? error.message : MENSAJES.servidor;
}

type Parametros = Record<string, string | number | null | undefined>;

export async function pedir<T>(
  base: string,
  ruta: string,
  parametros: Parametros = {},
  senal?: AbortSignal,
): Promise<T> {
  const consulta = Object.entries(parametros)
    .filter(([, valor]) => valor !== null && valor !== undefined && valor !== '')
    .map(([clave, valor]) => `${clave}=${encodeURIComponent(String(valor))}`)
    .join('&');
  const url = `${base}${ruta}${consulta ? `?${consulta}` : ''}`;

  // Corta la petición si pasa el tiempo máximo o si la pantalla la cancela
  const control = new AbortController();
  let vencio = false;
  const reloj = setTimeout(() => {
    vencio = true;
    control.abort();
  }, TIEMPO_MAXIMO_MS);
  const cancelar = () => control.abort();
  senal?.addEventListener('abort', cancelar);

  try {
    const respuesta = await fetch(url, {
      signal: control.signal,
      headers: { Accept: 'application/json' },
    });
    if (!respuesta.ok) throw new ErrorApi(tipoPorEstado(respuesta.status), respuesta.status);
    return (await respuesta.json()) as T;
  } catch (error) {
    if (error instanceof ErrorApi) throw error;
    // La pantalla canceló la petición (por ejemplo, cambió la búsqueda): no es un fallo
    if (senal?.aborted && !vencio) throw error;
    throw new ErrorApi(vencio ? 'tiempo' : 'red');
  } finally {
    clearTimeout(reloj);
    senal?.removeEventListener('abort', cancelar);
  }
}

function tipoPorEstado(estado: number): TipoError {
  if (estado === 404) return 'noEncontrado';
  if (estado === 400 || estado === 422) return 'peticion';
  // El backend responde 502 cuando Azure (Cosmos o Blob) no atiende la consulta
  if (estado === 502 || estado === 503 || estado === 504) return 'nube';
  return 'servidor';
}

// --- Tipos de las respuestas ---

export type Idioma = 'es' | 'en';

export type Libro = {
  id: string;
  titulo: string;
  autor?: string | null;
  iglesia?: string | null;
  tipo?: string | null;
  idioma?: Idioma | null;
  fecha?: string | null;
  anioDesde?: number | null;
  anioHasta?: number | null;
  numPaginas?: number | null;
  estado?: 'subido' | 'procesado' | 'error';
  portadaUrl?: string | null;
};

export type Capitulo = { titulo?: string; paginaInicial?: number; paginaFinal?: number };

export type LibroDetalle = Libro & { descripcion?: string | null; capitulos?: Capitulo[] };

export type PaginaLibros = { cantidad: number; desde: number; hayMas: boolean; libros: Libro[] };

export type Resultado = { bookId: string; titulo: string | null; numero: number; fragmento: string };

export type PaginaResultados = {
  cantidad: number;
  desde: number;
  hayMas: boolean;
  resultados: Resultado[];
};

export type PaginaTexto = { bookId: string; numero: number; idioma?: Idioma; texto: string };

export type FiltrosDisponibles = {
  iglesias: string[];
  tipos: string[];
  idiomas: Idioma[];
  anioDesde: number | null;
  anioHasta: number | null;
};

export type Salud = {
  cosmos: string;
  baseDeDatos: string;
  libros: number;
  conexion: { instancia: string; creada: string; proceso: number };
};

export type AvanceIntegrante = {
  nombre: string;
  desde: string;
  hasta: string;
  meta: number;
  subidos: number;
  procesados: number;
  conError: number;
  paginas: number;
};

export type Progreso = {
  actualizado: string;
  total: Omit<AvanceIntegrante, 'nombre' | 'desde' | 'hasta'>;
  equipo: AvanceIntegrante[];
  sinBloque: number;
};

export type EnlacePdf = { url: string; vence: string };

/** Filtros del buscador. Los mismos sirven para buscar libros y para buscar en el texto. */
export type Filtros = {
  iglesia: string | null;
  tipo: string | null;
  idioma: Idioma | null;
  anioDesde: number | null;
  anioHasta: number | null;
};

export const SIN_FILTROS: Filtros = {
  iglesia: null,
  tipo: null,
  idioma: null,
  anioDesde: null,
  anioHasta: null,
};

export function contarFiltros(filtros: Filtros): number {
  return Object.values(filtros).filter((valor) => valor !== null).length;
}

// --- Rutas de la API ---

export const api = {
  salud: (base: string, senal?: AbortSignal) => pedir<Salud>(base, '/salud', {}, senal),

  filtros: (base: string, senal?: AbortSignal) =>
    pedir<FiltrosDisponibles>(base, '/filtros', {}, senal),

  libros: (
    base: string,
    opciones: { titulo?: string; filtros?: Filtros; limite: number; desde: number },
    senal?: AbortSignal,
  ) =>
    pedir<PaginaLibros>(
      base,
      '/libros',
      {
        titulo: opciones.titulo,
        iglesia: opciones.filtros?.iglesia,
        tipo: opciones.filtros?.tipo,
        idioma: opciones.filtros?.idioma,
        anio_desde: opciones.filtros?.anioDesde,
        anio_hasta: opciones.filtros?.anioHasta,
        limite: opciones.limite,
        desde: opciones.desde,
      },
      senal,
    ),

  buscarTexto: (
    base: string,
    opciones: { q: string; filtros?: Filtros; libro?: string; limite: number; desde: number },
    senal?: AbortSignal,
  ) =>
    pedir<PaginaResultados>(
      base,
      '/buscar',
      {
        q: opciones.q,
        libro: opciones.libro,
        // El texto se indexa por idioma: sin elegir uno, se busca en español
        idioma: opciones.filtros?.idioma ?? 'es',
        iglesia: opciones.filtros?.iglesia,
        tipo: opciones.filtros?.tipo,
        anio_desde: opciones.filtros?.anioDesde,
        anio_hasta: opciones.filtros?.anioHasta,
        limite: opciones.limite,
        desde: opciones.desde,
      },
      senal,
    ),

  libro: (base: string, id: string, senal?: AbortSignal) =>
    pedir<LibroDetalle>(base, `/libros/${id}`, {}, senal),

  pagina: (base: string, id: string, numero: number, senal?: AbortSignal) =>
    pedir<PaginaTexto>(base, `/libros/${id}/paginas/${numero}`, {}, senal),

  pdf: (base: string, id: string) => pedir<EnlacePdf>(base, `/libros/${id}/pdf`),

  progreso: (base: string, senal?: AbortSignal) =>
    pedir<Progreso>(base, '/admin/progreso', {}, senal),
};

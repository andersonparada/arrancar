import type { EstadoDelCorreo, FiltroDeCorreos } from '../../servicios/correos.api';

/** Cuántos correos trae cada página del historial. */
export const CORREOS_POR_PAGINA = 50;

/** Lo que el usuario escoge en los filtros; vacío = sin filtrar. */
export interface FiltrosEscogidos {
  desde: string;
  hasta: string;
  estado: EstadoDelCorreo | '';
  tipo: string;
  pagina: number;
}

export const filtrosVacios = (): FiltrosEscogidos => ({ desde: '', hasta: '', estado: '', tipo: '', pagina: 1 });

/** Lo que se pide a la API: solo los filtros que tienen valor. */
export function filtroDeLaApi(filtros: FiltrosEscogidos): FiltroDeCorreos {
  return {
    pagina: filtros.pagina,
    limite: CORREOS_POR_PAGINA,
    ...(filtros.desde ? { desde: filtros.desde } : {}),
    ...(filtros.hasta ? { hasta: filtros.hasta } : {}),
    ...(filtros.estado ? { estado: filtros.estado } : {}),
    ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
  };
}

/** Si hay algún filtro puesto (la página no cuenta). */
export const hayFiltros = (filtros: FiltrosEscogidos): boolean =>
  Boolean(filtros.desde || filtros.hasta || filtros.estado || filtros.tipo);

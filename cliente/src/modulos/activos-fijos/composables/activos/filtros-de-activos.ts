import type { EstadoDeActivo, FiltrosDeActivos, TipoDeRegistro } from '../../servicios/activos.api';

/** Lo que muestran los filtros de la lista; vacío es «todos». */
export interface FiltrosDeLaLista {
  texto: string;
  estado: EstadoDeActivo | '';
  tipoDeRegistro: TipoDeRegistro | '';
  claseId: string | null;
  /** `''` todos, `ocioso` solo ociosos, `bodega` solo los guardados en la bodega de activos. */
  marca: '' | 'ocioso' | 'bodega';
}

export const filtrosVacios = (): FiltrosDeLaLista => ({
  texto: '',
  estado: '',
  tipoDeRegistro: '',
  claseId: null,
  marca: '',
});

/** Lo que se manda al servidor: solo los filtros que el usuario llenó. */
export function consultaDeActivos(filtros: FiltrosDeLaLista): FiltrosDeActivos {
  return {
    ...(filtros.texto.trim() ? { texto: filtros.texto.trim() } : {}),
    ...(filtros.estado ? { estado: filtros.estado } : {}),
    ...(filtros.tipoDeRegistro ? { tipoDeRegistro: filtros.tipoDeRegistro } : {}),
    ...(filtros.claseId ? { claseId: filtros.claseId } : {}),
    ...(filtros.marca === 'ocioso' ? { ocioso: true } : {}),
    ...(filtros.marca === 'bodega' ? { enBodega: true } : {}),
  };
}

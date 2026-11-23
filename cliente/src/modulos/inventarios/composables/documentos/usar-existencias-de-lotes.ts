import { reactive } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiExistencias } from '../../servicios/existencias.api';
import { idsDeLotesConExistencia } from './opciones-de-renglon';

const clave = (articuloId: string, bodegaId: string) => `${articuloId}|${bodegaId}`;

/**
 * Qué lotes de un artículo tienen existencia en una bodega, para proponer en las salidas solo lotes de los que hay.
 * Se piden una vez por artículo y bodega. Sin `existencias.ver` el servidor no las da y no se propone ningún lote:
 * el usuario elige el suyo.
 */
export function usarExistenciasDeLotes() {
  const avisos = usarAvisos();
  const puedeVerExistencias = usarSesion().puede('inventarios.existencias.ver');
  const porArticuloYBodega = reactive<Record<string, string[]>>({});

  async function cargar(articuloId: string | null, bodegaId: string | null): Promise<void> {
    if (!puedeVerExistencias || !articuloId || !bodegaId || porArticuloYBodega[clave(articuloId, bodegaId)]) return;
    try {
      const existencias = await apiExistencias.listar({ articuloId, bodegaId });
      porArticuloYBodega[clave(articuloId, bodegaId)] = idsDeLotesConExistencia(existencias);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar las existencias por lote.');
    }
  }

  const conExistencia = (articuloId: string | null, bodegaId: string | null): Set<string> =>
    new Set(articuloId && bodegaId ? (porArticuloYBodega[clave(articuloId, bodegaId)] ?? []) : []);

  /** Sin `existencias.ver` no se puede saber si un lote tiene existencia. */
  return { cargar, conExistencia, puedeVer: puedeVerExistencias };
}

import type { FastifyRequest } from 'fastify';
import type { CargaInicialDto } from '../aplicacion/dto/datos-de-empresa.dto.js';

const PERMISO_VER_CIERRES = 'empresas.carga-inicial.ver-cierres';

/**
 * La carga como la puede ver quien pregunta: la línea «Cerrada el … por …, con N diferencias» es de quien ve la
 * empresa, pero el motivo y los avisos del cierre solo llegan a quien puede ver los cierres guardados.
 */
export function cargaSegunPermiso(solicitud: FastifyRequest, carga: CargaInicialDto): CargaInicialDto {
  if (!carga.ultimoCierre || solicitud.contexto?.permisos.has(PERMISO_VER_CIERRES)) return carga;
  return { ...carga, ultimoCierre: { ...carga.ultimoCierre, motivo: null, avisos: null } };
}

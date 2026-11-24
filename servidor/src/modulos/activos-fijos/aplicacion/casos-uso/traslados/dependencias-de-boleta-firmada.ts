import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { DocumentosProtegidos } from '../../../../core/compartido/aplicacion/documentos-protegidos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { ConsultasTraslados } from '../../puertos/consultas-traslados.js';
import type { RepositorioBoletasFirmadas } from '../../puertos/repositorio-boletas-firmadas.js';
import type { RepositorioTraslados } from '../../puertos/repositorio-traslados.js';

/** El `recurso_dueno` de los archivos de las boletas firmadas y el recurso de su auditoría. */
export const RECURSO_DE_TRASLADOS = 'activos-fijos.traslados';

/** Lo que usan los casos de uso del escaneo firmado de una boleta. */
export interface DependenciasDeBoletaFirmada {
  unidadDeTrabajo: UnidadDeTrabajo;
  auditoria: Auditoria;
  documentos: DocumentosProtegidos;
  traslados: RepositorioTraslados;
  boletasFirmadas: RepositorioBoletasFirmadas;
  consultasDeTraslados: ConsultasTraslados;
}

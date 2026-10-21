import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { PuntoDeVista } from '../../dto/dto-de-documento-por-pagar.js';
import type { ConsultasDeDocumentos } from '../../puertos/puertos-de-consultas.js';

/** Lo que necesitan todos los casos de uso de consulta. */
export interface DependenciasDeConsultas {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeDocumentos;
  reloj: Reloj;
}

/** Quien opera y el día de hoy de su empresa. */
export async function puntoDeVistaDe(reloj: Reloj, operador: Operador): Promise<PuntoDeVista> {
  return { usuarioId: operador.usuarioId, hoy: await reloj.hoy(operador) };
}

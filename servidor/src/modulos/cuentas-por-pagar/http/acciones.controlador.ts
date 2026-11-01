import type { FastifyRequest } from 'fastify';
import { contextoDe } from '../../core/compartido/http/contexto-de-la-solicitud.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AutorizarDocumentos } from '../aplicacion/casos-uso/acciones/autorizar-documentos.js';
import type { CambiarVencimiento } from '../aplicacion/casos-uso/acciones/cambiar-vencimiento.js';
import type { CompletarDocumentos } from '../aplicacion/casos-uso/acciones/completar-documentos.js';
import type { DesautorizarDocumento } from '../aplicacion/casos-uso/acciones/desautorizar-documento.js';
import type {
  AutorizarDocumentosSolicitado,
  CambiarVencimientoSolicitado,
  CompletarDocumentosSolicitado,
  DesautorizarDocumentoSolicitado,
} from './acciones.esquemas-http.js';
import type { ParamsDeDocumento } from './documentos.esquemas-http.js';

export const PERMISO_DE_AUTORIZAR_PROPIOS = 'cuentas-por-pagar.documentos.autorizar-propios';

export interface CasosDeUsoDeAcciones {
  completar: CompletarDocumentos;
  autorizar: AutorizarDocumentos;
  desautorizar: DesautorizarDocumento;
  cambiarVencimiento: CambiarVencimiento;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class AccionesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeAcciones) {}

  completar = (solicitud: FastifyRequest<{ Body: CompletarDocumentosSolicitado }>) =>
    this.casosDeUso.completar.ejecutar(operadorDe(solicitud), solicitud.body.documentos);

  autorizar = (solicitud: FastifyRequest<{ Body: AutorizarDocumentosSolicitado }>) =>
    this.casosDeUso.autorizar.ejecutar(operadorDe(solicitud), {
      ids: solicitud.body.ids,
      puedeAutorizarPropios: contextoDe(solicitud).permisos.has(PERMISO_DE_AUTORIZAR_PROPIOS),
    });

  desautorizar = (solicitud: FastifyRequest<{ Params: ParamsDeDocumento; Body: DesautorizarDocumentoSolicitado }>) =>
    this.casosDeUso.desautorizar.ejecutar(operadorDe(solicitud), {
      id: solicitud.params.documentoId,
      motivo: solicitud.body.motivo,
    });

  cambiarVencimiento = (solicitud: FastifyRequest<{ Params: ParamsDeDocumento; Body: CambiarVencimientoSolicitado }>) =>
    this.casosDeUso.cambiarVencimiento.ejecutar(operadorDe(solicitud), {
      id: solicitud.params.documentoId,
      vencimiento: solicitud.body.vencimiento,
    });
}

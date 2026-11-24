import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type {
  ListarBeneficiariosParaElegir,
  ListarConceptosParaGasto,
  ListarMediosParaElegir,
} from '../aplicacion/casos-uso/opciones/consultas-de-opciones.js';

export interface CasosDeUsoDeOpciones {
  medios: ListarMediosParaElegir;
  conceptos: ListarConceptosParaGasto;
  beneficiarios: ListarBeneficiariosParaElegir;
}

/** Traduce las consultas de listas para las ventanas a sus casos de uso. */
export class OpcionesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeOpciones) {}

  medios = (solicitud: FastifyRequest<{ Querystring: { fecha?: string | undefined } }>) =>
    this.casosDeUso.medios.ejecutar(operadorDe(solicitud), solicitud.query.fecha);

  conceptos = (solicitud: FastifyRequest) => this.casosDeUso.conceptos.ejecutar(operadorDe(solicitud));

  /** El catálogo completo es de quien entrega (`anticipos.crear`); quien solo mira recibe los que ya tienen anticipos. */
  beneficiarios = (solicitud: FastifyRequest) =>
    this.casosDeUso.beneficiarios.ejecutar(
      operadorDe(solicitud),
      solicitud.contexto?.permisos.has('cuentas-por-liquidar.anticipos.crear') ?? false,
    );
}

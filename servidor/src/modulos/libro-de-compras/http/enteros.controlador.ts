import type { FastifyReply, FastifyRequest } from 'fastify';
import { aCentavos } from '../../core/compartido/dominio/centavos.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ConsultarEnterosDelAnio } from '../aplicacion/casos-uso/retenciones/consultar-enteros-del-anio.js';
import type {
  AnularEntero,
  CorregirEntero,
  RegistrarEntero,
} from '../aplicacion/casos-uso/retenciones/registrar-entero.js';
import type {
  AnioSolicitado,
  AnularEnteroSolicitado,
  CorregirEnteroSolicitado,
  NuevoEnteroSolicitado,
  ParamsDeEntero,
} from './retenciones.esquemas-http.js';

export interface CasosDeUsoDeEnteros {
  registrar: RegistrarEntero;
  corregir: CorregirEntero;
  anular: AnularEntero;
  matriz: ConsultarEnterosDelAnio;
}

/** Lo escrito del pago, con el monto en centavos. */
const datosDelPago = (cuerpo: CorregirEnteroSolicitado) => ({ ...cuerpo, monto: aCentavos(cuerpo.monto) });

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class EnterosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeEnteros) {}

  registrar = async (solicitud: FastifyRequest<{ Body: NuevoEnteroSolicitado }>, respuesta: FastifyReply) => {
    const peticion = { ...solicitud.body, ...datosDelPago(solicitud.body) };
    const resultado = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), peticion);
    return respuesta.status(201).send(resultado);
  };

  corregir = (solicitud: FastifyRequest<{ Params: ParamsDeEntero; Body: CorregirEnteroSolicitado }>) =>
    this.casosDeUso.corregir.ejecutar(operadorDe(solicitud), solicitud.params.id, datosDelPago(solicitud.body));

  anular = (solicitud: FastifyRequest<{ Params: ParamsDeEntero; Body: AnularEnteroSolicitado }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), { id: solicitud.params.id, motivo: solicitud.body.motivo });

  matriz = (solicitud: FastifyRequest<{ Querystring: AnioSolicitado }>) =>
    this.casosDeUso.matriz.ejecutar(operadorDe(solicitud), solicitud.query.anio);
}

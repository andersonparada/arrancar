import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarFormatoDeCheque } from '../aplicacion/casos-uso/formatos-de-cheque/actualizar-formato-de-cheque.js';
import type { ArmarPruebaDeAlineacion } from '../aplicacion/casos-uso/formatos-de-cheque/armar-prueba-de-alineacion.js';
import type { CambiarEstadoDeFormatoDeCheque } from '../aplicacion/casos-uso/formatos-de-cheque/cambiar-estado-de-formato-de-cheque.js';
import type {
  ListarFormatosDeCheque,
  ListarPlantillasDeCheque,
  ObtenerFormatoDeCheque,
} from '../aplicacion/casos-uso/formatos-de-cheque/consultar-formatos-de-cheque.js';
import type { CrearFormatoDeCheque } from '../aplicacion/casos-uso/formatos-de-cheque/crear-formato-de-cheque.js';
import type { EliminarFormatoDeCheque } from '../aplicacion/casos-uso/formatos-de-cheque/eliminar-formato-de-cheque.js';
import type { MarcarFormatoDeChequeProbado } from '../aplicacion/casos-uso/formatos-de-cheque/marcar-formato-de-cheque-probado.js';
import type {
  EliminacionDeFormatoDeCheque,
  FormatoDeChequeSolicitado,
  ParamsFormatoDeCheque,
  ParamsPlantillaDeCheque,
} from './formatos-de-cheque.esquemas-http.js';

export interface CasosDeUsoDeFormatosDeCheque {
  listar: ListarFormatosDeCheque;
  obtener: ObtenerFormatoDeCheque;
  crear: CrearFormatoDeCheque;
  actualizar: ActualizarFormatoDeCheque;
  cambiarEstado: CambiarEstadoDeFormatoDeCheque;
  eliminar: EliminarFormatoDeCheque;
  marcarProbado: MarcarFormatoDeChequeProbado;
  plantillas: ListarPlantillasDeCheque;
  prueba: ArmarPruebaDeAlineacion;
}

type ConId = FastifyRequest<{ Params: ParamsFormatoDeCheque }>;

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class FormatosDeChequeControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeFormatosDeCheque) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: ConId) => this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.formatoId);

  crear = async (solicitud: FastifyRequest<{ Body: FormatoDeChequeSolicitado }>, respuesta: FastifyReply) => {
    const formato = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(formato);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsFormatoDeCheque; Body: FormatoDeChequeSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      formatoId: solicitud.params.formatoId,
      solicitud: solicitud.body,
    });

  inactivar = (solicitud: ConId) =>
    this.casosDeUso.cambiarEstado.ejecutar(operadorDe(solicitud), {
      formatoId: solicitud.params.formatoId,
      activo: false,
    });

  reactivar = (solicitud: ConId) =>
    this.casosDeUso.cambiarEstado.ejecutar(operadorDe(solicitud), {
      formatoId: solicitud.params.formatoId,
      activo: true,
    });

  marcarProbado = (solicitud: ConId) =>
    this.casosDeUso.marcarProbado.ejecutar(operadorDe(solicitud), solicitud.params.formatoId);

  eliminar = async (
    solicitud: FastifyRequest<{ Params: ParamsFormatoDeCheque; Body: EliminacionDeFormatoDeCheque }>,
    respuesta: FastifyReply,
  ) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), {
      formatoId: solicitud.params.formatoId,
      motivo: solicitud.body.motivo,
    });
    return respuesta.status(204).send();
  };

  plantillas = () => this.casosDeUso.plantillas.ejecutar();

  prueba = (solicitud: ConId) => this.casosDeUso.prueba.deUnFormato(operadorDe(solicitud), solicitud.params.formatoId);

  pruebaDePlantilla = (solicitud: FastifyRequest<{ Params: ParamsPlantillaDeCheque }>) =>
    this.casosDeUso.prueba.deUnaPlantilla(operadorDe(solicitud), solicitud.params.clave);
}

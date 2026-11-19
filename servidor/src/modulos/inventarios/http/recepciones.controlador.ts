import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularDocumento } from '../aplicacion/casos-uso/movimientos/anular-documento.js';
import type { DescartarLinea } from '../aplicacion/casos-uso/recepciones/descartar-linea.js';
import type { DevolverLineaALaBandeja } from '../aplicacion/casos-uso/recepciones/devolver-linea-a-la-bandeja.js';
import type { ListarPorRecibir } from '../aplicacion/casos-uso/recepciones/listar-por-recibir.js';
import type { RecibirLineas } from '../aplicacion/casos-uso/recepciones/recibir-lineas.js';
import type { RegistrarDevolucionAProveedor } from '../aplicacion/casos-uso/recepciones/registrar-devolucion.js';
import type { RegistrarRebajaDeCosto } from '../aplicacion/casos-uso/recepciones/registrar-rebaja.js';
import type {
  DescarteSolicitado,
  DevolucionSolicitada,
  FiltrosDePorRecibirSolicitados,
  ParamsLinea,
  RebajaSolicitada,
  RecepcionSolicitada,
} from './recepciones.esquemas-http.js';
import type { AnulacionSolicitada, ParamsDocumento } from './movimientos.esquemas-http.js';
import { vistaDe } from './vista-de-la-solicitud.js';

export interface CasosDeUsoDeRecepciones {
  listar: ListarPorRecibir;
  recibir: RecibirLineas;
  devolver: RegistrarDevolucionAProveedor;
  rebajar: RegistrarRebajaDeCosto;
  descartar: DescartarLinea;
  devolverALaBandeja: DevolverLineaALaBandeja;
  anularRecepcion: AnularDocumento;
  anularDevolucion: AnularDocumento;
  anularRebaja: AnularDocumento;
}

type Anulacion = FastifyRequest<{ Params: ParamsDocumento; Body: AnulacionSolicitada }>;

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class RecepcionesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeRecepciones) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltrosDePorRecibirSolicitados }>) => {
    const { desde, hasta, ...resto } = solicitud.query;
    return this.casosDeUso.listar.ejecutar(operadorDe(solicitud), {
      ...resto,
      desde: desde ?? undefined,
      hasta: hasta ?? undefined,
    });
  };

  recibir = async (solicitud: FastifyRequest<{ Body: RecepcionSolicitada }>, respuesta: FastifyReply) => {
    const documentos = await this.casosDeUso.recibir.ejecutar(
      operadorDe(solicitud),
      solicitud.body,
      vistaDe(solicitud),
    );
    return respuesta.status(201).send({ documentos });
  };

  devolver = async (solicitud: FastifyRequest<{ Body: DevolucionSolicitada }>, respuesta: FastifyReply) => {
    const documento = await this.casosDeUso.devolver.ejecutar(
      operadorDe(solicitud),
      solicitud.body,
      vistaDe(solicitud),
    );
    return respuesta.status(201).send(documento);
  };

  rebajar = async (solicitud: FastifyRequest<{ Body: RebajaSolicitada }>, respuesta: FastifyReply) => {
    const documento = await this.casosDeUso.rebajar.ejecutar(operadorDe(solicitud), solicitud.body, vistaDe(solicitud));
    return respuesta.status(201).send(documento);
  };

  descartar = (solicitud: FastifyRequest<{ Params: ParamsLinea; Body: DescarteSolicitado }>) =>
    this.casosDeUso.descartar.ejecutar(operadorDe(solicitud), {
      lineaId: solicitud.params.lineaId,
      motivo: solicitud.body.motivo,
    });

  devolverALaBandeja = async (solicitud: FastifyRequest<{ Params: ParamsLinea }>, respuesta: FastifyReply) => {
    await this.casosDeUso.devolverALaBandeja.ejecutar(operadorDe(solicitud), solicitud.params.lineaId);
    return respuesta.status(204).send();
  };

  anularRecepcion = (solicitud: Anulacion) => this.anular(this.casosDeUso.anularRecepcion, solicitud);

  anularDevolucion = (solicitud: Anulacion) => this.anular(this.casosDeUso.anularDevolucion, solicitud);

  anularRebaja = (solicitud: Anulacion) => this.anular(this.casosDeUso.anularRebaja, solicitud);

  private anular(caso: AnularDocumento, solicitud: Anulacion) {
    return caso.ejecutar(
      operadorDe(solicitud),
      { documentoId: solicitud.params.documentoId, motivo: solicitud.body.motivo },
      vistaDe(solicitud),
    );
  }
}

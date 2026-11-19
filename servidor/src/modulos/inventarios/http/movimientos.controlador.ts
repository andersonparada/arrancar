import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ElegirMetodoDeCosteo } from '../aplicacion/casos-uso/metodo-de-costeo/elegir-metodo-de-costeo.js';
import type { ObtenerPoliticaDeCosteo } from '../aplicacion/casos-uso/metodo-de-costeo/obtener-politica-de-costeo.js';
import type { AnularDocumento } from '../aplicacion/casos-uso/movimientos/anular-documento.js';
import type { KardexDelArticulo } from '../aplicacion/casos-uso/movimientos/kardex-del-articulo.js';
import type { ListarDocumentos } from '../aplicacion/casos-uso/movimientos/listar-documentos.js';
import type { ListarExistencias } from '../aplicacion/casos-uso/movimientos/listar-existencias.js';
import type { ObtenerDocumento } from '../aplicacion/casos-uso/movimientos/obtener-documento.js';
import type { RegistrarEntradaManual } from '../aplicacion/casos-uso/movimientos/registrar-entrada-manual.js';
import type { RegistrarSalida } from '../aplicacion/casos-uso/movimientos/registrar-salida.js';
import type {
  AnulacionSolicitada,
  EntradaSolicitada,
  FiltrosDeDocumentosSolicitados,
  FiltrosDeExistenciasSolicitados,
  FiltrosDeKardexSolicitados,
  MetodoSolicitado,
  ParamsArticulo,
  ParamsDocumento,
  SalidaSolicitada,
} from './movimientos.esquemas-http.js';
import { vistaDe } from './vista-de-la-solicitud.js';

export interface CasosDeUsoDeMovimientos {
  registrarEntrada: RegistrarEntradaManual;
  registrarSalida: RegistrarSalida;
  anularEntrada: AnularDocumento;
  anularSalida: AnularDocumento;
  listarDocumentos: ListarDocumentos;
  obtenerDocumento: ObtenerDocumento;
  listarExistencias: ListarExistencias;
  kardex: KardexDelArticulo;
  obtenerPolitica: ObtenerPoliticaDeCosteo;
  elegirMetodo: ElegirMetodoDeCosteo;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class MovimientosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeMovimientos) {}

  registrarEntrada = async (solicitud: FastifyRequest<{ Body: EntradaSolicitada }>, respuesta: FastifyReply) => {
    const documento = await this.casosDeUso.registrarEntrada.ejecutar(
      operadorDe(solicitud),
      solicitud.body,
      vistaDe(solicitud),
    );
    return respuesta.status(201).send(documento);
  };

  registrarSalida = async (solicitud: FastifyRequest<{ Body: SalidaSolicitada }>, respuesta: FastifyReply) => {
    const documento = await this.casosDeUso.registrarSalida.ejecutar(
      operadorDe(solicitud),
      solicitud.body,
      vistaDe(solicitud),
    );
    return respuesta.status(201).send(documento);
  };

  anularEntrada = (solicitud: FastifyRequest<{ Params: ParamsDocumento; Body: AnulacionSolicitada }>) =>
    this.casosDeUso.anularEntrada.ejecutar(
      operadorDe(solicitud),
      { documentoId: solicitud.params.documentoId, motivo: solicitud.body.motivo },
      vistaDe(solicitud),
    );

  anularSalida = (solicitud: FastifyRequest<{ Params: ParamsDocumento; Body: AnulacionSolicitada }>) =>
    this.casosDeUso.anularSalida.ejecutar(
      operadorDe(solicitud),
      { documentoId: solicitud.params.documentoId, motivo: solicitud.body.motivo },
      vistaDe(solicitud),
    );

  listarDocumentos = (solicitud: FastifyRequest<{ Querystring: FiltrosDeDocumentosSolicitados }>) => {
    const { desde, hasta, ...resto } = solicitud.query;
    return this.casosDeUso.listarDocumentos.ejecutar(
      operadorDe(solicitud),
      { ...resto, desde: desde ?? undefined, hasta: hasta ?? undefined },
      vistaDe(solicitud),
    );
  };

  obtenerDocumento = (solicitud: FastifyRequest<{ Params: ParamsDocumento }>) =>
    this.casosDeUso.obtenerDocumento.ejecutar(operadorDe(solicitud), solicitud.params.documentoId, vistaDe(solicitud));

  listarExistencias = (solicitud: FastifyRequest<{ Querystring: FiltrosDeExistenciasSolicitados }>) =>
    this.casosDeUso.listarExistencias.ejecutar(operadorDe(solicitud), solicitud.query, vistaDe(solicitud));

  kardex = (solicitud: FastifyRequest<{ Params: ParamsArticulo; Querystring: FiltrosDeKardexSolicitados }>) => {
    const { desde, hasta, bodegaId } = solicitud.query;
    return this.casosDeUso.kardex.ejecutar(
      operadorDe(solicitud),
      {
        articuloId: solicitud.params.articuloId,
        filtros: { bodegaId, desde: desde ?? undefined, hasta: hasta ?? undefined },
      },
      vistaDe(solicitud),
    );
  };

  obtenerPolitica = (solicitud: FastifyRequest) => this.casosDeUso.obtenerPolitica.ejecutar(operadorDe(solicitud));

  elegirMetodo = (solicitud: FastifyRequest<{ Body: MetodoSolicitado }>) =>
    this.casosDeUso.elegirMetodo.ejecutar(operadorDe(solicitud), solicitud.body.metodo);
}

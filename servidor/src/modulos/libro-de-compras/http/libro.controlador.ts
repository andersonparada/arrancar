import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ConsultarAnuladosDelLibro, ConsultarLibro } from '../aplicacion/casos-uso/libro/consultar-libro.js';
import type {
  AbrirEmisionDelLibro,
  GenerarBorradorDelLibro,
  ListarEmisionesDelLibro,
} from '../aplicacion/casos-uso/libro/consultas-de-emisiones.js';
import type { CorregirUltimoFolio } from '../aplicacion/casos-uso/libro/corregir-ultimo-folio.js';
import type { EmitirLibroFoliado } from '../aplicacion/casos-uso/libro/emitir-libro-foliado.js';
import type { ExportarLibro } from '../aplicacion/casos-uso/libro/exportar-libro.js';
import type {
  ConsultaDeEmisionesSolicitada,
  ConsultaDelLibroSolicitada,
  CorreccionDelFolioSolicitada,
  EmisionDelLibroSolicitada,
  ParamsDeEmision,
} from './libro.esquemas-http.js';

export interface CasosDeUsoDelLibro {
  consultar: ConsultarLibro;
  anulados: ConsultarAnuladosDelLibro;
  exportar: ExportarLibro;
  borrador: GenerarBorradorDelLibro;
  emitir: EmitirLibroFoliado;
  emisiones: ListarEmisionesDelLibro;
  copia: AbrirEmisionDelLibro;
  corregirFolio: CorregirUltimoFolio;
}

const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const enviarPdf = (respuesta: FastifyReply, nombre: string, contenido: Buffer | NodeJS.ReadableStream) =>
  respuesta
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `inline; filename="${nombre}"`)
    .header('Cache-Control', 'private, no-store')
    .send(contenido);

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class LibroControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDelLibro) {}

  consultar = (solicitud: FastifyRequest<{ Querystring: ConsultaDelLibroSolicitada }>) =>
    this.casosDeUso.consultar.ejecutar(operadorDe(solicitud), solicitud.query.periodo);

  anulados = (solicitud: FastifyRequest<{ Querystring: ConsultaDelLibroSolicitada }>) =>
    this.casosDeUso.anulados.ejecutar(operadorDe(solicitud), solicitud.query.periodo);

  exportar = async (
    solicitud: FastifyRequest<{ Querystring: ConsultaDelLibroSolicitada }>,
    respuesta: FastifyReply,
  ) => {
    const { periodo } = solicitud.query;
    const contenido = await this.casosDeUso.exportar.ejecutar(operadorDe(solicitud), periodo);
    return respuesta
      .header('Content-Type', TIPO_EXCEL)
      .header('Content-Disposition', `attachment; filename="libro-de-compras-${periodo}.xlsx"`)
      .send(contenido);
  };

  borrador = async (
    solicitud: FastifyRequest<{ Querystring: ConsultaDelLibroSolicitada }>,
    respuesta: FastifyReply,
  ) => {
    const { periodo } = solicitud.query;
    const pdf = await this.casosDeUso.borrador.ejecutar(operadorDe(solicitud), periodo);
    return enviarPdf(respuesta, `libro-de-compras-${periodo}-borrador.pdf`, pdf);
  };

  emitir = async (solicitud: FastifyRequest<{ Body: EmisionDelLibroSolicitada }>, respuesta: FastifyReply) =>
    respuesta.status(201).send(await this.casosDeUso.emitir.ejecutar(operadorDe(solicitud), solicitud.body));

  emisiones = (solicitud: FastifyRequest<{ Querystring: ConsultaDeEmisionesSolicitada }>) =>
    this.casosDeUso.emisiones.ejecutar(operadorDe(solicitud), solicitud.query.periodo ?? null);

  copia = async (solicitud: FastifyRequest<{ Params: ParamsDeEmision }>, respuesta: FastifyReply) => {
    const copia = await this.casosDeUso.copia.ejecutar(operadorDe(solicitud), solicitud.params.emisionId);
    return enviarPdf(respuesta, copia.nombre, copia.contenido);
  };

  corregirFolio = (solicitud: FastifyRequest<{ Body: CorreccionDelFolioSolicitada }>) =>
    this.casosDeUso.corregirFolio.ejecutar(operadorDe(solicitud), solicitud.body);
}

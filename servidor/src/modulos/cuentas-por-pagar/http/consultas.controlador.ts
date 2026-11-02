import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ListarDocumentosPorPagar } from '../aplicacion/casos-uso/consultas/listar-documentos-por-pagar.js';
import type { ListarProveedoresConDocumentos } from '../aplicacion/casos-uso/consultas/listar-proveedores-con-documentos.js';
import type { ObtenerDocumentoPorPagar } from '../aplicacion/casos-uso/consultas/obtener-documento-por-pagar.js';
import type { ObtenerSaldoDelProveedor } from '../aplicacion/casos-uso/consultas/obtener-saldo-del-proveedor.js';
import type { VerBandeja } from '../aplicacion/casos-uso/consultas/ver-bandeja.js';
import type { FiltroDeDocumentosSolicitado, ParamsDeDocumento, ParamsDeProveedor } from './documentos.esquemas-http.js';

export interface CasosDeUsoDeConsultas {
  bandeja: VerBandeja;
  listar: ListarDocumentosPorPagar;
  obtener: ObtenerDocumentoPorPagar;
  saldoDelProveedor: ObtenerSaldoDelProveedor;
  proveedores: ListarProveedoresConDocumentos;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ConsultasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeConsultas) {}

  bandeja = (solicitud: FastifyRequest) => this.casosDeUso.bandeja.ejecutar(operadorDe(solicitud));

  listar = (solicitud: FastifyRequest<{ Querystring: FiltroDeDocumentosSolicitado }>) => {
    const { pagina, limite, ...filtro } = solicitud.query;
    return this.casosDeUso.listar.ejecutar(operadorDe(solicitud), filtro, { pagina, limite });
  };

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeDocumento }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.documentoId);

  proveedores = (solicitud: FastifyRequest) => this.casosDeUso.proveedores.ejecutar(operadorDe(solicitud));

  saldoDelProveedor = (solicitud: FastifyRequest<{ Params: ParamsDeProveedor }>) =>
    this.casosDeUso.saldoDelProveedor.ejecutar(operadorDe(solicitud), solicitud.params.proveedorId);
}

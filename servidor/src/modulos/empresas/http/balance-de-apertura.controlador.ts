import type { FastifyReply, FastifyRequest } from 'fastify';
import { leerDocumentoDeSolicitud } from '../../core/archivos/http/leer-documento.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AbrirBalanceDeApertura } from '../aplicacion/casos-uso/balance-de-apertura/abrir-balance-de-apertura.js';
import type { QuitarBalanceDeApertura } from '../aplicacion/casos-uso/balance-de-apertura/quitar-balance-de-apertura.js';
import type { SubirBalanceDeApertura } from '../aplicacion/casos-uso/balance-de-apertura/subir-balance-de-apertura.js';
import { cargaSegunPermiso } from './carga-segun-permiso.js';
import type { ParamsEmpresa } from './empresas.esquemas-http.js';

export interface CasosDeUsoDelBalanceDeApertura {
  subir: SubirBalanceDeApertura;
  quitar: QuitarBalanceDeApertura;
  abrir: AbrirBalanceDeApertura;
}

type Solicitud = FastifyRequest<{ Params: ParamsEmpresa }>;

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class BalanceDeAperturaControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDelBalanceDeApertura) {}

  subir = async (solicitud: Solicitud) => {
    const { contenido, nombre } = await leerDocumentoDeSolicitud(solicitud);
    const carga = await this.casosDeUso.subir.ejecutar(operadorDe(solicitud), {
      empresaId: solicitud.params.empresaId,
      contenido,
      nombre,
    });
    return cargaSegunPermiso(solicitud, carga);
  };

  quitar = async (solicitud: Solicitud) =>
    cargaSegunPermiso(
      solicitud,
      await this.casosDeUso.quitar.ejecutar(operadorDe(solicitud), solicitud.params.empresaId),
    );

  abrir = async (solicitud: Solicitud, respuesta: FastifyReply) => {
    const archivo = await this.casosDeUso.abrir.ejecutar(operadorDe(solicitud), solicitud.params.empresaId);
    return respuesta
      .header('Content-Type', archivo.tipoMime)
      .header('Content-Disposition', `inline; filename="${archivo.nombre}"`)
      .header('Cache-Control', 'private, no-store')
      .send(archivo.contenido);
  };
}

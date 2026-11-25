import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AbrirFondo } from '../aplicacion/casos-uso/fondos/abrir-fondo.js';
import type { AnularApertura } from '../aplicacion/casos-uso/fondos/anular-apertura.js';
import type { AumentarFondo } from '../aplicacion/casos-uso/fondos/aumentar-fondo.js';
import type { CerrarFondo } from '../aplicacion/casos-uso/fondos/cerrar-fondo.js';
import type { CambiarCustodio } from '../aplicacion/casos-uso/fondos/cambiar-custodio.js';
import type { ListarFondos, ObtenerFondo } from '../aplicacion/casos-uso/fondos/consultas-de-fondos.js';
import type { DisminuirFondo } from '../aplicacion/casos-uso/fondos/disminuir-fondo.js';
import type { EditarFondo } from '../aplicacion/casos-uso/fondos/editar-fondo.js';
import type {
  AnularAperturaSolicitada,
  AperturaSolicitada,
  AumentoSolicitado,
  CierreSolicitado,
  CustodioSolicitado,
  DisminucionSolicitada,
  EdicionSolicitada,
  ListaDeFondosSolicitada,
  ParamsDeFondo,
} from './fondos.esquemas-http.js';

const PERMISO_CERRAR_CON_DOCUMENTOS_POR_RESOLVER = 'caja-chica.fondos.cerrar-con-documentos-por-resolver';

export interface CasosDeUsoDeFondos {
  abrir: AbrirFondo;
  listar: ListarFondos;
  obtener: ObtenerFondo;
  editar: EditarFondo;
  cambiarCustodio: CambiarCustodio;
  aumentar: AumentarFondo;
  disminuir: DisminuirFondo;
  anularApertura: AnularApertura;
  cerrar: CerrarFondo;
}

type ConId<Cuerpo> = FastifyRequest<{ Params: ParamsDeFondo; Body: Cuerpo }>;

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class FondosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeFondos) {}

  abrir = async (solicitud: FastifyRequest<{ Body: AperturaSolicitada }>, respuesta: FastifyReply) => {
    const fondo = await this.casosDeUso.abrir.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(fondo);
  };

  listar = (solicitud: FastifyRequest<{ Querystring: ListaDeFondosSolicitada }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.query);

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeFondo }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.id);

  editar = (solicitud: ConId<EdicionSolicitada>) =>
    this.casosDeUso.editar.ejecutar(operadorDe(solicitud), { fondoId: solicitud.params.id, ...solicitud.body });

  cambiarCustodio = (solicitud: ConId<CustodioSolicitado>) =>
    this.casosDeUso.cambiarCustodio.ejecutar(operadorDe(solicitud), {
      fondoId: solicitud.params.id,
      ...solicitud.body,
    });

  aumentar = (solicitud: ConId<AumentoSolicitado>) =>
    this.casosDeUso.aumentar.ejecutar(operadorDe(solicitud), { fondoId: solicitud.params.id, ...solicitud.body });

  disminuir = (solicitud: ConId<DisminucionSolicitada>) =>
    this.casosDeUso.disminuir.ejecutar(operadorDe(solicitud), { fondoId: solicitud.params.id, ...solicitud.body });

  anularApertura = (solicitud: ConId<AnularAperturaSolicitada>) =>
    this.casosDeUso.anularApertura.ejecutar(operadorDe(solicitud), {
      fondoId: solicitud.params.id,
      ...solicitud.body,
    });

  cerrar = (solicitud: ConId<CierreSolicitado>) =>
    this.casosDeUso.cerrar.ejecutar(operadorDe(solicitud), {
      fondoId: solicitud.params.id,
      ...solicitud.body,
      puedeCerrarConDocumentosPorResolver:
        solicitud.contexto?.permisos.has(PERMISO_CERRAR_CON_DOCUMENTOS_POR_RESOLVER) ?? false,
    });
}

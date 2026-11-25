import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type {
  PonerEnDisputa,
  QuitarDeDisputa,
} from '../aplicacion/casos-uso/comprobantes/documento-anulado/disputa-del-documento-anulado.js';
import type { ReemplazarDocumentoAnulado } from '../aplicacion/casos-uso/comprobantes/documento-anulado/reemplazar-documento-anulado.js';
import type { ResolverDocumentoAnulado } from '../aplicacion/casos-uso/comprobantes/documento-anulado/resolver-documento-anulado.js';
import type {
  ConMotivoDelDocumento,
  DisputaSolicitada,
  ParamsDeDocumentoAnulado,
  ReemplazoSolicitado,
  SalidaSolicitada,
} from './documento-anulado.esquemas-http.js';

export interface CasosDeUsoDeDocumentoAnulado {
  resolver: ResolverDocumentoAnulado;
  reemplazar: ReemplazarDocumentoAnulado;
  ponerEnDisputa: PonerEnDisputa;
  quitarDeDisputa: QuitarDeDisputa;
}

type Solicitud<Cuerpo> = FastifyRequest<{ Params: ParamsDeDocumentoAnulado; Body: Cuerpo }>;

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class DocumentoAnuladoControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeDocumentoAnulado) {}

  resolver = (solicitud: Solicitud<SalidaSolicitada>) =>
    this.casosDeUso.resolver.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      comprobanteId: solicitud.params.id,
    });

  reemplazar = (solicitud: Solicitud<ReemplazoSolicitado>) =>
    this.casosDeUso.reemplazar.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      comprobanteId: solicitud.params.id,
    });

  ponerEnDisputa = (solicitud: Solicitud<DisputaSolicitada>) =>
    this.casosDeUso.ponerEnDisputa.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      comprobanteId: solicitud.params.id,
    });

  quitarDeDisputa = (solicitud: Solicitud<ConMotivoDelDocumento>) =>
    this.casosDeUso.quitarDeDisputa.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      comprobanteId: solicitud.params.id,
    });
}

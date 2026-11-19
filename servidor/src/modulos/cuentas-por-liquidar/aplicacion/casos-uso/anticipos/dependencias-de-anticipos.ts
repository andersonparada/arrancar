import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { MovimientosDeBancos, OrdenesABancos } from '../../puertos/puertos-de-bancos.js';
import type {
  ConsultasDeAnticipos,
  MarcadorDeDocumentos,
  PoliticaDeAnticipos,
  ReferenciasDelAnticipo,
  RepositorioDeAnticipos,
} from '../../puertos/puertos-de-anticipos.js';

/** Lo que necesitan los casos de uso de los anticipos. */
export interface DependenciasDeAnticipos {
  unidadDeTrabajo: UnidadDeTrabajo;
  anticipos: RepositorioDeAnticipos;
  consultas: ConsultasDeAnticipos;
  referencias: ReferenciasDelAnticipo;
  politica: PoliticaDeAnticipos;
  /** Las órdenes a Bancos (por el mediador): el cheque o la nota de la entrega y su anulación. */
  bancos: OrdenesABancos;
  /** Lo que se lee de Bancos sin orden: bloquear el movimiento, si está conciliado, su fecha, cuenta y número. */
  movimientos: MovimientosDeBancos;
  /** Los documentos del libro de los gastos se marcan procesados al liquidar. */
  documentos: MarcadorDeDocumentos;
  correlativos: Correlativos;
  auditoria: Auditoria;
  /** Se publica después de confirmar la transacción de la propia petición (o de la de Bancos, si llegó por aviso). */
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
}

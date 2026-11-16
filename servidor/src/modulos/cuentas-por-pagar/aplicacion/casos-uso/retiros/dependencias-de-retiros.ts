import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { MovimientosDePagos, PagosEnBancos } from '../../puertos/puertos-de-pagos.js';
import type { ConsultasDeRetiros, CustodiosDeRetiros, RepositorioDeRetiros } from '../../puertos/puertos-de-retiros.js';

/** Lo que necesitan los casos de uso de los retiros de efectivo. */
export interface DependenciasDeRetiros {
  unidadDeTrabajo: UnidadDeTrabajo;
  retiros: RepositorioDeRetiros;
  consultas: ConsultasDeRetiros;
  custodios: CustodiosDeRetiros;
  /** Las órdenes a Bancos (por el mediador): el cheque o la nota del retiro, el depósito y el desglose. */
  bancos: PagosEnBancos;
  /** Lo que se lee de Bancos sin orden: bloquear el movimiento, si está conciliado y su cuenta y número. */
  movimientos: MovimientosDePagos;
  correlativos: Correlativos;
  auditoria: Auditoria;
  /** Se publica después de confirmar la transacción de la propia petición (o de la de Bancos, si llegó por aviso). */
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
}

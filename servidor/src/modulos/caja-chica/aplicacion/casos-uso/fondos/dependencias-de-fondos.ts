import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { FondosEnBancos } from '../../puertos/puertos-de-bancos.js';
import type {
  ConsultasDeFondos,
  CustodiosDeFondos,
  MovimientosDeFondos,
  ReferenciasDeFondos,
  RepositorioDeFondos,
} from '../../puertos/puertos-de-fondos.js';

/** Lo que necesitan los casos de uso de los fondos. */
export interface DependenciasDeFondos {
  unidadDeTrabajo: UnidadDeTrabajo;
  fondos: RepositorioDeFondos;
  consultas: ConsultasDeFondos;
  custodios: CustodiosDeFondos;
  referencias: ReferenciasDeFondos;
  /** Las órdenes a Bancos (por el mediador): el cheque o la nota de la apertura, los aumentos y los depósitos. */
  bancos: FondosEnBancos;
  movimientos: MovimientosDeFondos;
  auditoria: Auditoria;
  /** Se publica después de confirmar la transacción de la propia petición (o de la de Bancos, si llegó por aviso). */
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
}

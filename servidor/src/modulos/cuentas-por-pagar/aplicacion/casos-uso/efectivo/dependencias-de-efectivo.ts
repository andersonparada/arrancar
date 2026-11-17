import type { BloqueoDeBancarizacion } from '../../puertos/puertos-de-efectivo.js';
import type { MovimientosDePagos } from '../../puertos/puertos-de-pagos.js';
import type { ConsultasDeRetiros, RepositorioDeRetiros } from '../../puertos/puertos-de-retiros.js';
import type { DependenciasDeRegistrarPago } from '../pagos/dependencias-de-pagos.js';

/** Lo que necesita repartir el efectivo de un retiro: lo de registrar un pago, más el retiro y el bloqueo de bancarización. */
export interface DependenciasDeEfectivo extends DependenciasDeRegistrarPago {
  retiros: RepositorioDeRetiros;
  consultasDeRetiros: ConsultasDeRetiros;
  /** Lo que se lee de Bancos sin orden: bloquear el cheque o la nota del retiro, su cuenta y su número. */
  movimientos: MovimientosDePagos;
  bloqueoDeBancarizacion: BloqueoDeBancarizacion;
}

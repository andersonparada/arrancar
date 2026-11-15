import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { FormaDePago } from './pagos.js';
import type { OrigenDeDocumento } from './tipos-de-documento.js';

/** Lo que un pago entregó a un cargo, para que Contabilidad reparta la partida. */
export interface AplicacionDelEvento {
  documentoId: string;
  documentoDeCompraId: string | null;
  origen: OrigenDeDocumento;
  montoCentavos: number;
  retencionDescontadaCentavos: number;
  tieneActivoFijo: boolean;
}

export interface DatosDePagoRegistrado {
  empresaId: string;
  pagoId: string;
  numero: number;
  contrasenaIds: string[];
  proveedorId: string;
  forma: FormaDePago;
  /** La del cheque (Contabilidad fecha la partida aquí, también si está posfechado). */
  fecha: string;
  posfechado: boolean;
  montoCentavos: number;
  movimientoId: string | null;
  cuentaBancariaId: string | null;
  retiroId: string | null;
  sinBancarizar: boolean;
  efecto: 'banco' | 'transitoria_por_aplicar' | 'apertura' | 'correccion_de_error' | 'efectivo';
  aplicaciones: AplicacionDelEvento[];
}

/** Se registró un pago a un proveedor. Se publica tras confirmar la transacción. */
export class PagoRegistrado extends EventoDominio<DatosDePagoRegistrado> {
  readonly nombre = 'cuentas-por-pagar.pago_registrado';

  constructor(datos: DatosDePagoRegistrado) {
    super(datos);
  }
}

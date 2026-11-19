import type { EstadoDeUnPago, LineaSolicitada, PagoRegistrado } from './tipos-de-pagos';

export type FormaDeRetiro = 'cheque' | 'nota_de_debito';
export type EstadoDeRetiro = 'abierto' | 'liquidado' | 'anulado';
export type EstadoBuscadoDeRetiro = EstadoDeRetiro | 'todos';

/** El cheque o la nota que Bancos creó para el retiro (o para su devolución). `numero` es el del cheque o de la nota. */
export interface MovimientoDelRetiro {
  id: string;
  cuentaBancariaId: string;
  numero: number;
}

/** Un pago en efectivo del retiro. Dinero como texto con dos decimales. */
export interface PagoDelRetiro {
  id: string;
  numero: string;
  proveedor: { id: string; nombre: string };
  fecha: string;
  monto: string;
  estado: EstadoDeUnPago;
}

/** Una fila de la lista de retiros. */
export interface RetiroResumen {
  id: string;
  numero: string;
  forma: FormaDeRetiro;
  documento: number;
  cuentaBancariaId: string;
  fecha: string;
  custodio: string;
  monto: string;
  pagado: string;
  /** Al corte si se pidió; si no, lo que queda por usar hoy. */
  disponible: string;
  estado: EstadoDeRetiro;
  deMesAnterior: boolean;
  aviso: string | null;
}

export interface PaginaDeRetiros {
  elementos: RetiroResumen[];
  total: number;
  /** La suma del disponible de todo lo filtrado. */
  totalDisponible: string;
}

/** Lo que se manda a `GET /retiros`; lo que falta es «sin filtro». */
export interface ConsultaDeRetiros {
  estado: EstadoBuscadoDeRetiro;
  corte?: string;
  desde?: string;
  hasta?: string;
  soloConDisponible?: boolean;
  pagina: number;
  limite: number;
}

/** El retiro completo, con sus pagos, lo que se puede hacer con él y los avisos que no bloquean. */
export interface Retiro {
  id: string;
  numero: string;
  forma: FormaDeRetiro;
  fecha: string;
  monto: string;
  movimiento: MovimientoDelRetiro;
  custodio: string;
  custodioUsuarioId: string | null;
  observaciones: string | null;
  estado: EstadoDeRetiro;
  pagado: string;
  disponible: string;
  devuelto: string;
  faltante: string;
  motivoDeFaltante: string | null;
  liquidacion: { fecha: string; deposito: MovimientoDelRetiro | null } | null;
  anulacion: { fecha: string; motivo: string } | null;
  pagos: PagoDelRetiro[];
  deMesAnterior: boolean;
  puedeAnular: boolean;
  puedeLiquidar: boolean;
  puedeReabrir: boolean;
  liquidaElCustodio: boolean;
  avisos: string[];
}

/** Lo común a las dos formas de registrar un retiro. */
interface SolicitudBaseDeRetiro {
  fecha?: string;
  monto: string;
  custodio: string | null;
  custodioUsuarioId: string | null;
  observaciones: string | null;
}

/** Lo que se manda a `POST /retiros`. */
export type SolicitudDeRetiro =
  | (SolicitudBaseDeRetiro & {
      forma: 'cheque';
      chequeraId: string;
      noNegociable: boolean;
      /** «PARA ABONO EN CUENTA» (art. 521): apagado por omisión. */
      paraAbonoEnCuenta: boolean;
      beneficiario: string | null;
    })
  | (SolicitudBaseDeRetiro & { forma: 'nota_de_debito'; cuentaBancariaId: string; referencia: string | null });

export interface SolicitudDeLiquidacion {
  fecha?: string;
  devuelto: string;
  cuentaBancariaId?: string;
  referencia: string | null;
  faltante: string;
  motivoDeFaltante: string | null;
}

export interface SolicitudDeCambioDeRetiro {
  motivo: string;
  fecha?: string;
}

/** Un pago del reparto: lo que se le entrega a un proveedor. */
export interface PagoEnEfectivoSolicitado {
  proveedorId: string;
  fecha?: string;
  recibidoPor: string | null;
  referencia: string | null;
  observaciones: string | null;
  motivoSinBancarizar: string | null;
  aplicaciones: LineaSolicitada[];
  diferencias?: LineaSolicitada[];
}

export interface SolicitudDeReparto {
  pagos: PagoEnEfectivoSolicitado[];
}

/** Lo que responde el reparto: el retiro con su disponible nuevo, los pagos creados y los avisos. */
export interface RepartoRegistrado {
  retiro: Retiro;
  pagos: PagoRegistrado[];
  avisos: string[];
}

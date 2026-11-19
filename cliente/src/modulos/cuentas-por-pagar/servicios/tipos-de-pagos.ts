import type { ChequesDeAperturaSinLigar, OrigenDelDocumento, TipoDeDocumento } from './tipos';

export type * from './tipos-de-consulta-de-pagos';

/** Las formas que se registran desde «Nuevo pago»; el efectivo tiene su propia pantalla. */
export type FormaDePagoNuevo = 'cheque' | 'nota_de_debito' | 'nota_ligada' | 'cuenta_de_apertura';
export type FormaDePago = FormaDePagoNuevo | 'efectivo';
export type EstadoDeUnPago = 'vigente' | 'anulado';
/** Los cinco estados de pago de un cargo, iguales en la lista, la ficha, la contraseña y los reportes. */
export type EstadoDePago = 'pendiente' | 'en_parte' | 'comprometido_en_parte' | 'comprometido' | 'pagado';

/** Un pago de la contraseña, con lo que entregó dentro de ella. */
export interface PagoDeLaContrasena {
  pagoId: string;
  numero: string;
  forma: FormaDePago;
  fecha: string;
  estado: EstadoDeUnPago;
  monto: string;
  comprometido: boolean;
}

export interface ContrasenaDelPago {
  id: string;
  numero: string;
}

/** Un proveedor con cargos autorizados con saldo en contraseñas vigentes: el selector de «Nuevo pago». */
export interface ProveedorPorPagar {
  proveedorId: string;
  nombre: string;
  nit: string | null;
  /** La deuda con el proveedor (también lo comprometido con cheques posfechados). */
  porPagar: string;
  /** Lo que aún se puede pagar: `porPagar` menos lo comprometido. */
  disponible: string;
  contrasenas: number;
}

export interface PaginaDeProveedoresPorPagar {
  elementos: ProveedorPorPagar[];
  total: number;
}

/** Un cargo que la pantalla ofrece pagar, con lo necesario para decidir cuánto. Dinero como texto. */
export interface CargoParaPagar {
  id: string;
  contrasenaId: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  origen: OrigenDelDocumento;
  fechaDeEmision: string;
  fechaDeRecepcion: string | null;
  vencimiento: string | null;
  total: string;
  /** La deuda: también lo comprometido con cheques posfechados. */
  saldo: string;
  /** La parte de la deuda cubierta con cheques posfechados. */
  comprometido: string;
  /** Lo que aún se puede pagar (`saldo` menos `comprometido`): el tope del monto. */
  disponible: string;
  /** La fecha del cheque posfechado más lejano; `null` si no hay. */
  comprometidoHasta: string | null;
  propuesto: string;
  retencionPorDescontar: string;
  retencionesPorPracticar: string;
  constanciasPendientes: number;
  /** `AAAA-MM`: el mes con el que se entera la retención más antigua. */
  mesDeRetencion: string | null;
  tieneActivoFijo: boolean;
  sobreUmbralDeBancarizacion: boolean;
}

/** Lo que «Nuevo pago» necesita de un proveedor. */
export interface ParaPagar {
  contrasenas: Array<ContrasenaDelPago & { fecha: string }>;
  cargos: CargoParaPagar[];
  noAutorizados: CargoParaPagar[];
  fechaMinima: string | null;
  fechaDeInicio: string | null;
  cargaCerrada: boolean;
  /** El nombre del NIT; `null` si hay que escribirlo en Terceros. */
  beneficiario: string | null;
  sumaDelMesAlProveedor: string;
  umbralDeBancarizacion: string;
  topeDiferencia: string;
  /** Posfechados de apertura sin ligar que podrían ser de este proveedor (AP-0). */
  chequesDeAperturaSinLigar: ChequesDeAperturaSinLigar;
}

export interface ChequeraParaPagar {
  chequeraId: string;
  serie: string | null;
  siguienteChequeId: string | null;
  siguienteNumero: number | null;
}

export interface CuentaParaPagar {
  cuentaBancariaId: string;
  nombre: string;
  bancoNombre: string | null;
  numero: string;
  saldoCentavos: number;
  chequeras: ChequeraParaPagar[];
}

export interface MediosDePago {
  cuentas: CuentaParaPagar[];
}

/** Una nota de débito marcada para Cuentas por pagar con lo que le queda por aplicar. */
export interface NotaParaLigar {
  movimientoId: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  fecha: string;
  numero: number | null;
  referencia: string | null;
  beneficiario: string | null;
  monto: string;
  aplicado: string;
  disponible: string;
}

export interface LineaSolicitada {
  cargoId: string;
  monto: string;
}

/** Lo común a toda solicitud de pago. */
interface SolicitudBase {
  proveedorId: string;
  fecha?: string;
  referencia?: string | null;
  observaciones?: string | null;
  aplicaciones: LineaSolicitada[];
  diferencias?: LineaSolicitada[];
}

export type SolicitudDePago =
  | (SolicitudBase & {
      forma: 'cheque';
      chequeraId: string;
      chequeId?: string;
      noNegociable: boolean;
      /** «PARA ABONO EN CUENTA» (art. 521): apagado por omisión. */
      paraAbonoEnCuenta: boolean;
    })
  | (SolicitudBase & { forma: 'nota_de_debito'; cuentaBancariaId: string })
  | (SolicitudBase & { forma: 'nota_ligada'; movimientoId: string })
  | (Omit<SolicitudBase, 'diferencias'> & { forma: 'cuenta_de_apertura'; motivo: string });

/** El pago registrado; `avisos` son los que no bloquean (los de Cuentas por pagar y los de Bancos). */
export interface PagoRegistrado {
  id: string;
  numero: string;
  contrasenas: ContrasenaDelPago[];
  proveedor: { id: string; nombre: string; nit: string | null };
  beneficiario: string;
  forma: FormaDePago;
  fecha: string;
  posfechado: boolean;
  monto: string;
  movimiento: { id: string; cuentaBancariaId: string; numero: number } | null;
  estado: EstadoDeUnPago;
  avisos: string[];
}

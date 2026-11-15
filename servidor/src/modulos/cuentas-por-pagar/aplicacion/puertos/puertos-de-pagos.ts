import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type {
  AvisoDeBancos,
  LineaDeConcepto,
  MediosDePago,
  OrigenDeMovimientoContrato,
} from '../../../core/contratos/bancos.contratos.js';
import type { EfectoFiscal } from '../../dominio/bancarizacion-de-pagos.js';
import type { RetencionDelLibro } from '../../dominio/avisos-de-pagos.js';

/** Lo que Bancos necesita para emitir el cheque de un pago. */
export interface ChequeAEmitir {
  origen: OrigenDeMovimientoContrato;
  chequeraId: string;
  chequeId?: string;
  fecha: string;
  montoCentavos: number;
  beneficiario: string;
  noNegociable: boolean;
  conceptos: LineaDeConcepto[];
  referencia?: string;
  observaciones?: string;
}

/** Lo que Bancos necesita para registrar la nota de débito de un pago. */
export interface NotaDeDebitoARegistrar {
  origen: OrigenDeMovimientoContrato;
  cuentaBancariaId: string;
  fecha: string;
  montoCentavos: number;
  beneficiario: string;
  conceptos: LineaDeConcepto[];
  referencia?: string;
  observaciones?: string;
}

/** El movimiento que Bancos creó, con sus avisos (el de fondos de un posfechado). */
export interface MovimientoCreado {
  movimientoId: string;
  cuentaBancariaId: string;
  /** El número del cheque o el de la nota. */
  numero: number;
  avisos: AvisoDeBancos[];
}

/** Las órdenes a Bancos (por el mediador): este módulo no lo importa. */
export interface PagosEnBancos {
  medios(operador: Operador, fecha: string): Promise<MediosDePago>;
  emitirCheque(operador: Operador, cheque: ChequeAEmitir): Promise<MovimientoCreado>;
  registrarNotaDeDebito(operador: Operador, nota: NotaDeDebitoARegistrar): Promise<MovimientoCreado>;
}

/** Una línea del pago lista para guardar. */
export interface LineaDePagoNueva {
  cargoId: string;
  contrasenaId: string;
  montoCentavos: number;
  retencionDescontadaCentavos: number;
}

/** El pago listo para guardar: el id lo genera el caso de uso porque es el origen del movimiento de Bancos. */
export interface PagoNuevo {
  id: string;
  proveedorId: string;
  numero: number;
  anioDeNumero: number;
  forma: 'cheque' | 'nota_de_debito';
  /** `AAAA-MM-DD`. */
  fecha: string;
  movimientoId: string;
  observaciones: string | null;
  lineas: LineaDePagoNueva[];
}

export interface RepositorioDePagos {
  /** Guarda el pago `vigente` con sus líneas. */
  agregar(pago: PagoNuevo): Promise<void>;
  /** Los cargos que ya tienen un pago vigente donde se descontó su retención. */
  conRetencionYaDescontada(cargoIds: readonly string[]): Promise<Set<string>>;
}

/** Un pago vigente del mes del proveedor. */
export interface PagoDelMes {
  numero: number;
  anioDeNumero: number;
  forma: 'cheque' | 'nota_de_debito' | 'nota_ligada' | 'efectivo';
  montoCentavos: number;
  /** Los cargos que cubre (solo se llena en efectivo, para saber qué respalda). */
  cargoIds: string[];
}

export interface ConsultasDePagos {
  /**
   * Los pagos vigentes al proveedor en el mes calendario de la fecha, con cheque, nota de débito, nota ligada o efectivo
   * (no la cuenta de apertura).
   */
  pagosDelMes(proveedorId: string, fecha: string): Promise<PagoDelMes[]>;
  /** Número y fecha de cada contraseña, por id. */
  contrasenas(ids: readonly string[]): Promise<Map<string, { numero: string; fecha: string }>>;
  /** Los proveedores con cargos autorizados con saldo en contraseñas vigentes, por nombre. */
  proveedoresPorPagar(filtro: { buscar?: string; pagina: number; limite: number }): Promise<ProveedoresPorPagar>;
}

export interface ProveedorPorPagar {
  proveedorId: string;
  nombre: string;
  nit: string | null;
  porPagarCentavos: number;
  contrasenas: number;
}

export interface ProveedoresPorPagar {
  filas: ProveedorPorPagar[];
  total: number;
}

/** Las retenciones de los documentos del libro (lectura). */
export interface RetencionesDelLibro {
  /** Por id de Cuentas por pagar del cargo; los saldos iniciales no aparecen. */
  deCargos(cargoIds: readonly string[]): Promise<Map<string, RetencionDelLibro[]>>;
}

/** El nombre del NIT del proveedor: de Terceros y, si falta, del DTE más reciente de los cargos del pago. */
export interface NombreDelNit {
  de(proveedorId: string, cargoIds: readonly string[]): Promise<string | null>;
}

/**
 * Los datos fiscales de la empresa (Libro de compras, lectura): qué perdería cada cargo sin bancarización, según el régimen
 * de la empresa en el período del documento (en un saldo inicial, el de la fecha de inicio): el crédito fiscal del IVA y la
 * deducción del ISR. Un cargo para el que la empresa no tiene datos fiscales vigentes no aparece: no se supone régimen.
 */
export interface DatosFiscalesDeLaEmpresa {
  efectoDe(cargoIds: readonly string[], fechaDeInicio: string | null): Promise<Map<string, EfectoFiscal>>;
}

/** El tope de la diferencia de centavos que se da por saldada al pagar. */
export interface TopeDeDiferenciaDelPago {
  /** El tope de la empresa, en centavos; 0 lo apaga. */
  centavos(contexto: ContextoEmpresa): Promise<number>;
}

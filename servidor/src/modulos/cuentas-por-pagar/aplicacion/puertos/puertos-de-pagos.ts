import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type {
  AvisoDeBancos,
  LineaDeConcepto,
  MediosDePago,
  OrigenDeMovimientoContrato,
} from '../../../core/contratos/bancos.contratos.js';
import type { AnulacionEnBancos } from '../../dominio/anulacion-de-pagos.js';
import type { EfectoFiscal } from '../../dominio/bancarizacion-de-pagos.js';
import type { PagoConLineas } from '../../dominio/pago-con-lineas.js';
import type { RetencionDelLibro } from '../../dominio/avisos-de-pagos.js';
import type { LigadoAUnaNota } from './puertos-de-notas-para-ligar.js';

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

/** Lo que Bancos necesita para registrar la nota de crédito de un depósito (el sobrante de un retiro). */
export type NotaDeCreditoARegistrar = NotaDeDebitoARegistrar;

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
  /** El depósito de lo que sobró de un retiro, con el retiro como origen. */
  registrarNotaDeCredito(operador: Operador, nota: NotaDeCreditoARegistrar): Promise<MovimientoCreado>;
  /** Anula el cheque o la nota que creó el pago (Bancos decide si a la antigua o con inverso); lanza lo que rechace Bancos. */
  anularMovimiento(operador: Operador, anulacion: AnulacionDeMovimiento): Promise<AnulacionDelMovimiento>;
  /** Vuelve a fijar el reparto por concepto del movimiento del pago (solo clasifica el flujo). */
  fijarDesglose(operador: Operador, desglose: DesgloseDelMovimiento): Promise<void>;
}

/** Lo que Bancos necesita para anular el movimiento de un pago. */
export interface AnulacionDeMovimiento {
  origen: OrigenDeMovimientoContrato;
  movimientoId: string;
  motivo: string;
  /** La fecha del inverso, si hay; por omisión decide Bancos (hoy o la del original según su configuración). */
  fecha?: string;
}

/** Cómo anuló Bancos el movimiento, y la fecha del inverso si lo hubo (la lee de sus movimientos por `inversoId`). */
export interface AnulacionDelMovimiento {
  forma: Exclude<AnulacionEnBancos, null>;
  fechaDelInverso: string | null;
}

export interface DesgloseDelMovimiento {
  /** Nulo en una nota marcada que se liga: no tiene origen, y Bancos revisa que esté marcada. */
  origen: OrigenDeMovimientoContrato | null;
  movimientoId: string;
  conceptos: LineaDeConcepto[];
}

/** Lo que se lee de Bancos (infraestructura, sin orden) de un movimiento de un pago. */
export interface MovimientosDePagos {
  /** Deja bloqueado el movimiento de Bancos (solo lectura para bloquear): se bloquea antes que el retiro. */
  bloquear(movimientoId: string): Promise<void>;
  /** Si el movimiento ya está conciliado (el banco lo pagó); `false` si no existe. */
  estaConciliado(movimientoId: string): Promise<boolean>;
  /** La fecha de un movimiento, p. ej. la del inverso con que Bancos anuló el cheque; `null` si no existe. */
  fechaDe(movimientoId: string): Promise<string | null>;
  /** Cuenta, número del cheque o de la nota y beneficiario de cada movimiento, para mostrar el pago. */
  datosDe(movimientoId: string): Promise<DatosDelMovimiento | null>;
  /** Lo que la ficha del pago muestra de su cheque o nota: cuenta, tipo, número, fecha y si está conciliado o anulado. */
  fichaDe(movimientoId: string): Promise<FichaDelMovimiento | null>;
}

export interface FichaDelMovimiento {
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  tipo: 'cheque' | 'nota_de_debito' | 'nota_de_credito';
  /** El número del cheque o el de la nota. */
  numero: number;
  fecha: string;
  conciliado: boolean;
  /** Anulado o revertido en Bancos. */
  anulado: boolean;
}

export interface DatosDelMovimiento {
  cuentaBancariaId: string;
  /** El número del cheque o el de la nota. */
  numero: number;
  beneficiario: string | null;
}

/** Cómo se anula un pago guardado. */
export interface AnulacionDePago {
  anuladoPor: string;
  motivo: string;
  /** `AAAA-MM-DD`: la fecha contable de la anulación (CP5-a). */
  fechaDeAnulacion: string;
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
  forma: 'cheque' | 'nota_de_debito' | 'nota_ligada' | 'cuenta_de_apertura' | 'efectivo';
  /** `AAAA-MM-DD`. */
  fecha: string;
  /** Nulo en la cuenta de apertura y en efectivo (el movimiento es del retiro). */
  movimientoId: string | null;
  /** El recibo del proveedor (nota ligada) o el comprobante del sistema anterior (apertura); en cheque y nota de débito va a Bancos. */
  referencia?: string | null;
  /** Solo en la cuenta de apertura: por qué se da por pagado. */
  motivo?: string | null;
  /** Solo en la cuenta de apertura: si la carga inicial estaba cerrada. */
  conCargaCerrada?: boolean | null;
  /** Solo en efectivo: el retiro de donde sale el dinero, quien recibió por el proveedor y la excepción de bancarización. */
  retiroId?: string | null;
  recibidoPor?: string | null;
  motivoSinBancarizar?: string | null;
  observaciones: string | null;
  lineas: LineaDePagoNueva[];
}

export interface RepositorioDePagos {
  /** Guarda el pago `vigente` con sus líneas. */
  agregar(pago: PagoNuevo): Promise<void>;
  /** Los cargos que ya tienen un pago vigente donde se descontó su retención. */
  conRetencionYaDescontada(cargoIds: readonly string[]): Promise<Set<string>>;
  /** El pago con todas sus líneas; `null` si no existe en la empresa. */
  buscar(id: string): Promise<PagoConLineas | null>;
  /** Igual que `buscar`, y deja la fila bloqueada para este caso de uso. */
  bloquear(id: string): Promise<PagoConLineas | null>;
  /** Lo que los pagos vigentes ligan de una nota de Bancos y, de eso, lo pagado a cargos de activo fijo. */
  ligadoAlMovimiento(movimientoId: string): Promise<LigadoAUnaNota>;
  /** Los pagos (vigentes y anulados) cuyo movimiento en Bancos es este, por número. */
  delMovimiento(movimientoId: string): Promise<PagoConLineas[]>;
  /** Deja el pago `anulado` con quién, cuándo, por qué y la fecha contable, y sus líneas `vigente = false`. */
  anular(id: string, anulacion: AnulacionDePago): Promise<void>;
  /** Cambia a qué cargos cubre un pago vigente: borra sus líneas y guarda las nuevas. */
  reemplazarLineas(pago: Pick<PagoConLineas, 'id' | 'proveedorId'>, lineas: LineaDePagoNueva[]): Promise<void>;
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
  /** Lo que pierde la empresa en general según su régimen en la fecha; `null` si no tiene datos fiscales vigentes. */
  efectoDeLaEmpresa(fecha: string): Promise<EfectoFiscal | null>;
}

/** El tope de la diferencia de centavos que se da por saldada al pagar. */
export interface TopeDeDiferenciaDelPago {
  /** El tope de la empresa, en centavos; 0 lo apaga. */
  centavos(contexto: ContextoEmpresa): Promise<number>;
}

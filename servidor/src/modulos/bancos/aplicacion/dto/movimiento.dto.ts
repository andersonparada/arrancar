import type { LineaDeConcepto } from '../../../core/contratos/bancos.contratos.js';
import type { OrigenDeMovimiento } from '../../dominio/origen-de-movimiento.js';
import type { ParteDeApertura } from '../../dominio/partes-de-apertura.js';

/** Una línea del reparto por concepto de un movimiento (CP4): el concepto y la parte del monto que clasifica. */
export interface LineaDeDesgloseDto {
  conceptoId: string;
  concepto: string;
  monto: string;
}

/** Movimiento tal como lo ve el usuario en pantalla. */
export interface MovimientoDto {
  id: string;
  cuentaBancariaId: string;
  tipo: 'credito' | 'debito' | 'cheque';
  fecha: string;
  monto: string;
  saldoInicial: boolean;
  /** La parte de la carga inicial que es (saldo del banco, depósito en tránsito…); `null` si es un movimiento normal. */
  parteDeApertura: ParteDeApertura | null;
  referencia: string | null;
  beneficiario: string | null;
  observaciones: string | null;
  /** Cómo se clasifica el dinero (H3b): el concepto y su nombre. */
  conceptoId: string;
  conceptoNombre: string;
  /** Intereses (H8): el bruto y el ISR retenido de una nota con un concepto que los pide; el `monto` es el neto. */
  interesBruto: string | null;
  isrRetenido: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  cuentaBancariaNombre: string | null;
  /** La transferencia que lo creó, si es una de sus dos notas; si no, `null`. */
  transferenciaId: string | null;
  /** El cheque que lo creó, si es tipo `cheque`; si no, `null`. */
  chequeId: string | null;
  /** El número del cheque que lo creó; si no, `null`. */
  numeroDeCheque: number | null;
  /** La conciliación donde quedó marcado; si no, `null`. */
  conciliacionId: string | null;
  /** Cuándo se revirtió (se le creó un inverso); `null` si nunca se revirtió. */
  revertidoEn: string | null;
  motivoDeReversion: string | null;
  /** El movimiento original que revierte, si este es un inverso; si no, `null`. */
  revierteAId: string | null;
  /** Número correlativo de su tipo (nota de crédito o de débito, inversos incluidos); `null` en cheques, saldo inicial y notas de transferencia. */
  numero: number | null;
  /** Año del correlativo si la empresa lo reinicia cada año; 0 si no (lo normal). */
  anioDeNumero: number;
  /** El módulo que generó el movimiento (P6) y su documento; `null` si nació en Bancos. */
  moduloDeOrigen: string | null;
  documentoDeOrigenId: string | null;
  /** Lo calcula el servidor (ver `accionesDeMovimiento`): si se puede anular con un movimiento inverso. */
  puedeAnular: boolean;
  /** Lo calcula el servidor: si se puede eliminar de verdad (está limpio). */
  puedeEliminar: boolean;
  /** Lo calcula el servidor: si se le puede cambiar solo el concepto (no un inverso, ni una transferencia, ni el saldo inicial). */
  puedeReclasificar: boolean;
  /** Nota de débito suelta con el concepto «Pago a proveedores»: Cuentas por pagar puede aplicarla a facturas (CP4). */
  marcadaParaCuentasPorPagar: boolean;
  /** El reparto por concepto cuando no es «todo al concepto del movimiento»; vacío si no lo hay. */
  desglose: LineaDeDesgloseDto[];
  /** Lo calcula el servidor (estructural: al marcar también se exige Cuentas por pagar activo). */
  puedeMarcar: boolean;
  puedeDesmarcar: boolean;
}

/** Lo que se recibe para registrar o corregir un movimiento, ya validado en su forma. La API nunca acepta `tipo: 'cheque'`. */
export type SolicitudDeMovimiento = Omit<
  MovimientoDto,
  | 'id'
  | 'parteDeApertura'
  | 'anuladoEn'
  | 'motivoDeAnulacion'
  | 'cuentaBancariaNombre'
  | 'transferenciaId'
  | 'chequeId'
  | 'numeroDeCheque'
  | 'conciliacionId'
  | 'revertidoEn'
  | 'motivoDeReversion'
  | 'revierteAId'
  | 'numero'
  | 'anioDeNumero'
  | 'moduloDeOrigen'
  | 'documentoDeOrigenId'
  | 'puedeAnular'
  | 'puedeEliminar'
  | 'puedeReclasificar'
  | 'marcadaParaCuentasPorPagar'
  | 'desglose'
  | 'puedeMarcar'
  | 'puedeDesmarcar'
  | 'conceptoId'
  | 'conceptoNombre'
  | 'interesBruto'
  | 'isrRetenido'
> & {
  tipo: 'credito' | 'debito';
  /** Solo con un concepto que pide datos de intereses (H8); si no, van vacíos. */
  interesBruto?: string | null;
  isrRetenido?: string | null;
  /** Lo elige el usuario en una nota; el saldo inicial no lo trae: lo asigna el sistema. */
  conceptoId?: string;
  /** Registrar la nota de débito ya marcada para Cuentas por pagar (exige el módulo activo). */
  marcarParaCuentasPorPagar?: boolean;
  /** Solo lo pasan las órdenes de otro módulo (nunca la API): el origen y el reparto por concepto fijos. */
  origen?: OrigenDeMovimiento;
  conceptos?: LineaDeConcepto[];
};

/** Qué movimientos listar: de una cuenta y entre dos fechas (incluidas); lo que falte no filtra.
 * `clase` acota a solo notas (crédito o débito sueltas) o solo saldos iniciales; sin ella, todo (para el reporte). */
export interface FiltroDeMovimientos {
  cuentaBancariaId?: string;
  desde?: string;
  hasta?: string;
  /** Solo los movimientos con este concepto (para «Sin clasificar», el de sistema `sin_clasificar`). */
  conceptoId?: string;
  clase?: 'notas' | 'saldosIniciales';
}

/**
 * Lo que falta clasificar (concepto «Sin clasificar») en un periodo y cuenta: solo los originales vigentes
 * (un inverso sigue a su original y no se cuenta dos veces). Los montos son la suma de los créditos y la de los
 * débitos y cheques, por separado, para no mezclar entradas con salidas.
 */
export interface ResumenDeSinClasificar {
  cantidad: number;
  montoDeEntradas: string;
  montoDeSalidas: string;
}

/** Cambiar solo el concepto de varios movimientos a la vez (todo o nada). */
export interface SolicitudDeReclasificacion {
  movimientoIds: string[];
  conceptoId: string;
}

/** Aceptar sugerencias: cada movimiento con su concepto (todo o nada). */
export interface SolicitudDeReclasificacionVarios {
  asignaciones: Array<{ movimientoId: string; conceptoId: string }>;
  /** Los conceptos vienen de sugerencias aceptadas: queda dicho en el motivo de la auditoría. */
  porSugerencia: boolean;
}

/** Cuántos cambiaron de concepto y cuántos ya lo tenían (no se tocan ni se auditan). */
export interface ResultadoDeReclasificacion {
  reclasificados: number;
  sinCambio: number;
}

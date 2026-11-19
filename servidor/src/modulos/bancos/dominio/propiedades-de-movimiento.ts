import type { Identificador } from '../../core/compartido/dominio/identificador.js';
import type { DatosDeIntereses, PropiedadesDeIntereses } from './intereses.js';
import type { ParteDeApertura } from './partes-de-apertura.js';

export type MovimientoId = Identificador<'Movimiento'>;

/** Lo que el usuario puede escribir de un movimiento. */
export interface DatosDeMovimiento extends DatosDeIntereses {
  cuentaBancariaId: string;
  tipo: 'credito' | 'debito' | 'cheque';
  fecha: string;
  monto: string;
  saldoInicial: boolean;
  referencia: string | null;
  beneficiario: string | null;
  observaciones: string | null;
  /** Cómo se clasifica el dinero (H3b). Un original lo elige el usuario; los demás los asigna el sistema. */
  conceptoId: string;
}

export interface PropiedadesDeMovimiento
  extends Omit<DatosDeMovimiento, keyof DatosDeIntereses>, PropiedadesDeIntereses {
  id: MovimientoId;
  empresaId: Identificador<'Empresa'>;
  /** Anulación a la antigua: solo la usan los cheques en un mes abierto (sin inverso, fuera del saldo). */
  anuladoEn: Date | null;
  motivoDeAnulacion: string | null;
  /** La transferencia que lo creó, si es una de sus dos notas; si no, `null`. */
  transferenciaId: string | null;
  /** Cuándo y por qué se revirtió (creó su inverso); `null` si nunca se revirtió. */
  revertidoEn: Date | null;
  motivoDeReversion: string | null;
  /** El movimiento original que revierte, si este es un inverso; si no, `null`. */
  revierteAId: string | null;
  /** Número correlativo de su tipo (nota de crédito o de débito); `null` en cheques, saldo inicial y notas de transferencia. */
  numero: number | null;
  /** Año del correlativo si la empresa lo reinicia cada año; 0 si no. */
  anioDeNumero: number;
  /** El módulo que lo generó (P6), si no nació en Bancos; va junto con `documentoDeOrigenId` o ambos son `null`. */
  moduloDeOrigen: string | null;
  /** El documento de ese módulo que lo generó (sin llave foránea: vive en otro esquema). */
  documentoDeOrigenId: string | null;
  /**
   * La parte del saldo inicial que es (docs/modulos/diseno-bancos-segunda-parte.md §2) y la cabecera de la que cuelga:
   * las dos juntas o ninguna.
   */
  parteDeApertura: ParteDeApertura | null;
  saldoInicialId: string | null;
  /** «PARA ABONO EN CUENTA» (C. Com. art. 521): solo un cheque; viaja con el movimiento al pasar a otro formulario. */
  paraAbonoEnCuenta: boolean;
}

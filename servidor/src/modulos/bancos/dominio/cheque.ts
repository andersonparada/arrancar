import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { ChequeAnulado, ChequeNoDisponible, ChequeNoEmitido, MotivoDeAnulacionInvalido } from './errores.js';
import {
  CausaDeAnulacionNoPermitida,
  ChequeImpresoNoSeBlanquea,
  ChequeImpresoNoSeCorrige,
  ChequeNoEstaEmitido,
  ChequeNoSePasaDeFormulario,
} from './errores-de-impresion.js';

export type ChequeId = Identificador<'Cheque'>;
export type EstadoDelCheque = 'disponible' | 'emitido' | 'anulado';
/**
 * Por qué se anuló un cheque: a mano, por caducidad (no cambia su concepto), `inutilizado` (el papel se arruinó y el pago
 * pasó a otro formulario: queda sin movimiento) o `extraviado` (el título pudo circular: sí anula el pago).
 */
export type CausaDeAnulacion = 'manual' | 'caducidad' | 'inutilizado' | 'extraviado';

export interface PropiedadesDeCheque {
  id: ChequeId;
  empresaId: Identificador<'Empresa'>;
  chequeraId: string;
  numero: number;
  estado: EstadoDelCheque;
  noNegociable: boolean;
  movimientoId: string | null;
  anuladoEn: Date | null;
  motivoDeAnulacion: string | null;
  /** Nula mientras no esté anulado. */
  causaDeAnulacion: CausaDeAnulacion | null;
  /** La primera impresión; nula mientras no se imprima. No vuelve a cambiar. */
  impresoEn: Date | null;
}

const MAXIMO_DEL_MOTIVO = 500;

/** El aviso fijo de un cheque anulado como extraviado: el título pudo circular y el banco debe saberlo. */
export const avisoDeChequeExtraviado = (numero: number): string =>
  `Avise al banco por escrito para que no pague el cheque ${numero} (la cancelación y reposición de títulos tiene su propio procedimiento).`;

/** El aviso que acompaña al cheque según por qué se anuló; `null` si no lo lleva. */
export const avisoDeAnulacion = (causa: CausaDeAnulacion | null, numero: number): string | null =>
  causa === 'extraviado' ? avisoDeChequeExtraviado(numero) : null;

/** La referencia que el sistema pone al emitir si quien emite no escribió una. */
export const referenciaAutomaticaDeCheque = (serie: string | null, numero: number): string =>
  `Cheque ${serie ?? ''}${numero}`;

/**
 * Un cheque de una chequera. Nace disponible; se emite una sola vez (crea su
 * movimiento y queda enlazado a él) y se anula, disponible o emitido, sin
 * volver a usarse: conserva su número.
 */
export class Cheque extends Entidad<ChequeId> {
  private constructor(private propiedades: PropiedadesDeCheque) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, chequeraId: string, numero: number): Cheque {
    return new Cheque({
      id: Identificador.nuevo(),
      empresaId,
      chequeraId,
      numero,
      estado: 'disponible',
      noNegociable: true,
      movimientoId: null,
      anuladoEn: null,
      motivoDeAnulacion: null,
      causaDeAnulacion: null,
      impresoEn: null,
    });
  }

  static reconstruir(propiedades: PropiedadesDeCheque): Cheque {
    return new Cheque(propiedades);
  }

  /** @throws ChequeNoDisponible si no está disponible. */
  emitir(movimientoId: string, noNegociable: boolean): void {
    if (this.propiedades.estado !== 'disponible') throw new ChequeNoDisponible();
    this.propiedades = { ...this.propiedades, estado: 'emitido', movimientoId, noNegociable };
  }

  /**
   * `causa` es `manual` salvo que lo anule el proceso de cheques caducos (H6b) o se declare extraviado (solo un cheque
   * emitido: el título pudo circular). `inutilizado` solo sale de `inutilizar`.
   * @throws ChequeAnulado si ya está anulado; MotivoDeAnulacionInvalido si falta el motivo.
   * @throws ChequeNoEstaEmitido si se pide `extraviado` de uno que no está emitido; CausaDeAnulacionNoPermitida si se pide `inutilizado`.
   */
  anular(motivo: string, causa: CausaDeAnulacion = 'manual'): void {
    if (this.propiedades.estado === 'anulado') throw new ChequeAnulado();
    if (causa === 'inutilizado') throw new CausaDeAnulacionNoPermitida();
    if (causa === 'extraviado' && this.propiedades.estado !== 'emitido') throw new ChequeNoEstaEmitido();
    this.marcarAnulado(motivo, causa);
  }

  private marcarAnulado(motivo: string, causa: CausaDeAnulacion): void {
    const motivoDeAnulacion = motivo.trim();
    if (!motivoDeAnulacion || motivoDeAnulacion.length > MAXIMO_DEL_MOTIVO) throw new MotivoDeAnulacionInvalido();
    this.propiedades = {
      ...this.propiedades,
      estado: 'anulado',
      anuladoEn: new Date(),
      motivoDeAnulacion,
      causaDeAnulacion: causa,
    };
  }

  /**
   * Lo blanquea: se registró por error y nunca se imprimió ni se entregó. Vuelve a `disponible`
   * (se olvida su beneficiario, fecha y monto, y su número se puede volver a usar); el movimiento
   * lo elimina de verdad quien llama, en la misma transacción.
   * @throws ChequeNoEmitido si no está emitido; ChequeImpresoNoSeBlanquea si ya se imprimió.
   */
  blanquear(): void {
    if (this.propiedades.estado !== 'emitido') throw new ChequeNoEmitido();
    if (this.estaImpreso) throw new ChequeImpresoNoSeBlanquea();
    this.propiedades = { ...this.propiedades, estado: 'disponible', movimientoId: null, noNegociable: true };
  }

  get estaDisponible(): boolean {
    return this.propiedades.estado === 'disponible';
  }

  /**
   * El papel quedó inservible y sigue en la empresa: el cheque queda anulado como `inutilizado` y **sin movimiento** (el
   * pago pasa a otro formulario; quien llama lo mueve en la misma transacción).
   * @throws ChequeNoSePasaDeFormulario si no está emitido o no se imprimió (sin papel impreso no hay qué inutilizar).
   * @throws MotivoDeAnulacionInvalido si falta el motivo.
   */
  inutilizar(motivo: string): void {
    if (this.propiedades.estado !== 'emitido') {
      throw new ChequeNoSePasaDeFormulario(`El cheque ${this.propiedades.numero} no está emitido.`);
    }
    if (!this.estaImpreso) {
      throw new ChequeNoSePasaDeFormulario(
        `El cheque ${this.propiedades.numero} no se ha impreso: no hay papel que inutilizar.`,
      );
    }
    this.marcarAnulado(motivo, 'inutilizado');
    this.propiedades = { ...this.propiedades, movimientoId: null };
  }

  /** Marca la primera impresión; las siguientes no la cambian. */
  marcarImpreso(cuando: Date): void {
    if (this.propiedades.impresoEn === null) this.propiedades = { ...this.propiedades, impresoEn: cuando };
  }

  /**
   * Corrige «no negociable» de un cheque emitido y todavía sin imprimir (la otra condición, «para abono en cuenta», va
   * en su movimiento).
   * @throws ChequeNoEstaEmitido si no está emitido; ChequeImpresoNoSeCorrige si ya se imprimió.
   */
  corregirNoNegociable(noNegociable: boolean): void {
    if (this.propiedades.estado !== 'emitido') throw new ChequeNoEstaEmitido();
    if (this.estaImpreso) throw new ChequeImpresoNoSeCorrige();
    this.propiedades = { ...this.propiedades, noNegociable };
  }

  get estaImpreso(): boolean {
    return this.propiedades.impresoEn !== null;
  }

  get estaEmitido(): boolean {
    return this.propiedades.estado === 'emitido';
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeCheque> {
    return { ...this.propiedades };
  }
}

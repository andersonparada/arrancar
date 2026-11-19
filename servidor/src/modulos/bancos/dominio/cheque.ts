import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { ChequeAnulado, ChequeNoDisponible, ChequeNoEmitido, MotivoDeAnulacionInvalido } from './errores.js';
import { ChequeImpresoNoSeBlanquea } from './errores-de-impresion.js';

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
   * `causa` es `manual` salvo que lo anule el proceso de cheques caducos (H6b).
   * @throws ChequeAnulado si ya está anulado; MotivoDeAnulacionInvalido si falta el motivo.
   */
  anular(motivo: string, causa: CausaDeAnulacion = 'manual'): void {
    if (this.propiedades.estado === 'anulado') throw new ChequeAnulado();
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

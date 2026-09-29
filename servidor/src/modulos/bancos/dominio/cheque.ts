import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { ChequeAnulado, ChequeNoDisponible, ChequeNoEmitido, MotivoDeAnulacionInvalido } from './errores.js';

export type ChequeId = Identificador<'Cheque'>;
export type EstadoDelCheque = 'disponible' | 'emitido' | 'anulado';
/** Por qué se anuló un cheque (P1): a mano o por caducidad. La caducidad no cambia su concepto. */
export type CausaDeAnulacion = 'manual' | 'caducidad';

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
   * TODO: cuando exista la impresión de cheques, bloquear el blanqueo si ya se imprimió.
   * @throws ChequeNoEmitido si no está emitido.
   */
  blanquear(): void {
    if (this.propiedades.estado !== 'emitido') throw new ChequeNoEmitido();
    this.propiedades = { ...this.propiedades, estado: 'disponible', movimientoId: null, noNegociable: true };
  }

  get estaDisponible(): boolean {
    return this.propiedades.estado === 'disponible';
  }

  get estaEmitido(): boolean {
    return this.propiedades.estado === 'emitido';
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeCheque> {
    return { ...this.propiedades };
  }
}

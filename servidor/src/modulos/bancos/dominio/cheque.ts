import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { ChequeAnulado, ChequeNoDisponible, MotivoDeAnulacionInvalido } from './errores.js';

export type ChequeId = Identificador<'Cheque'>;
export type EstadoDelCheque = 'disponible' | 'emitido' | 'anulado';

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

  /** @throws ChequeAnulado si ya está anulado; MotivoDeAnulacionInvalido si falta el motivo. */
  anular(motivo: string): void {
    if (this.propiedades.estado === 'anulado') throw new ChequeAnulado();
    const motivoDeAnulacion = motivo.trim();
    if (!motivoDeAnulacion || motivoDeAnulacion.length > MAXIMO_DEL_MOTIVO) throw new MotivoDeAnulacionInvalido();
    this.propiedades = { ...this.propiedades, estado: 'anulado', anuladoEn: new Date(), motivoDeAnulacion };
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

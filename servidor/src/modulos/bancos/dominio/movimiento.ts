import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { aCentavos } from './centavos.js';
import {
  MontoInvalido,
  MotivoDeAnulacionInvalido,
  MovimientoAnulado,
  MovimientoDeCheque,
  MovimientoDeTransferencia,
  NoEsUnaNota,
  NoEsUnSaldoInicial,
} from './errores.js';

export type MovimientoId = Identificador<'Movimiento'>;

/** Lo que el usuario puede escribir de un movimiento. */
export interface DatosDeMovimiento {
  cuentaBancariaId: string;
  tipo: 'credito' | 'debito' | 'cheque';
  fecha: string;
  monto: string;
  saldoInicial: boolean;
  referencia: string | null;
  beneficiario: string | null;
  observaciones: string | null;
}

export interface PropiedadesDeMovimiento extends DatosDeMovimiento {
  id: MovimientoId;
  empresaId: Identificador<'Empresa'>;
  anuladoEn: Date | null;
  motivoDeAnulacion: string | null;
  /** La transferencia que lo creó, si es una de sus dos notas; si no, `null`. */
  transferenciaId: string | null;
}

const MAXIMO_DEL_MOTIVO = 500;

function datosValidos(datos: DatosDeMovimiento): DatosDeMovimiento {
  if (aCentavos(datos.monto) <= 0) throw new MontoInvalido();
  return datos;
}

/**
 * Una nota de crédito (entra dinero) o de débito (sale). El monto siempre es
 * positivo: el tipo dice la dirección. Nada se borra: se anula con su motivo.
 */
export class Movimiento extends Entidad<MovimientoId> {
  private constructor(private propiedades: PropiedadesDeMovimiento) {
    super(propiedades.id);
  }

  /** `transferenciaId` solo lo pasa `RegistrarTransferencia`: nunca llega del usuario. */
  static crear(
    empresaId: Identificador<'Empresa'>,
    datos: DatosDeMovimiento,
    transferenciaId: string | null = null,
  ): Movimiento {
    return new Movimiento({
      ...datosValidos(datos),
      empresaId,
      id: Identificador.nuevo(),
      anuladoEn: null,
      motivoDeAnulacion: null,
      transferenciaId,
    });
  }

  static reconstruir(propiedades: PropiedadesDeMovimiento): Movimiento {
    return new Movimiento(propiedades);
  }

  /**
   * Corrige sus datos; la cuenta y `saldoInicial` no cambian (una nota no se vuelve saldo
   * inicial ni al revés; para cambiar de cuenta se anula y se registra en la otra).
   * @throws MovimientoAnulado si ya está anulado; MovimientoDeTransferencia si es de una transferencia.
   */
  corregir(datos: DatosDeMovimiento): void {
    this.exigirVigente();
    this.exigirSuelto();
    const { cuentaBancariaId, saldoInicial } = this.propiedades;
    this.propiedades = { ...this.propiedades, ...datosValidos({ ...datos, cuentaBancariaId, saldoInicial }) };
  }

  /**
   * Exige que el movimiento sea de la clase que espera quien lo pide (nota o saldo inicial).
   * @throws NoEsUnaNota si se esperaba una nota y es el saldo inicial; NoEsUnSaldoInicial si es al revés.
   */
  exigirClase(esSaldoInicial: boolean): void {
    if (this.propiedades.saldoInicial && !esSaldoInicial) throw new NoEsUnaNota();
    if (!this.propiedades.saldoInicial && esSaldoInicial) throw new NoEsUnSaldoInicial();
  }

  /**
   * Anula la nota por sí sola.
   * @throws MovimientoAnulado si ya está anulado; MovimientoDeTransferencia si es de una transferencia;
   *   MotivoDeAnulacionInvalido si falta el motivo.
   */
  anular(motivo: string): void {
    this.exigirSuelto();
    this.anularSinRevisar(motivo);
  }

  /**
   * Anula la nota porque se anuló su transferencia: la única forma de anular una
   * nota que pertenece a una.
   * @throws MovimientoAnulado si ya está anulado; MotivoDeAnulacionInvalido si falta el motivo.
   */
  anularPorTransferencia(motivo: string): void {
    this.anularSinRevisar(motivo);
  }

  /**
   * Anula la nota porque se anuló su cheque: la única forma de anular una nota
   * que es un cheque.
   * @throws MovimientoAnulado si ya está anulado; MotivoDeAnulacionInvalido si falta el motivo.
   */
  anularPorCheque(motivo: string): void {
    this.anularSinRevisar(motivo);
  }

  get estaAnulado(): boolean {
    return this.propiedades.anuladoEn !== null;
  }

  /** Cuánto mueve el saldo de su cuenta, en centavos: positivo si entra, negativo si sale, cero si está anulado. */
  get efectoEnCentavos(): number {
    if (this.estaAnulado) return 0;
    const monto = aCentavos(this.propiedades.monto);
    return this.propiedades.tipo === 'credito' ? monto : -monto;
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeMovimiento> {
    return { ...this.propiedades };
  }

  private anularSinRevisar(motivo: string): void {
    this.exigirVigente();
    const motivoDeAnulacion = motivo.trim();
    if (!motivoDeAnulacion || motivoDeAnulacion.length > MAXIMO_DEL_MOTIVO) throw new MotivoDeAnulacionInvalido();
    this.propiedades = { ...this.propiedades, anuladoEn: new Date(), motivoDeAnulacion };
  }

  private exigirVigente(): void {
    if (this.estaAnulado) throw new MovimientoAnulado();
  }

  private exigirSuelto(): void {
    if (this.propiedades.transferenciaId) throw new MovimientoDeTransferencia();
    if (this.propiedades.tipo === 'cheque') throw new MovimientoDeCheque();
  }
}

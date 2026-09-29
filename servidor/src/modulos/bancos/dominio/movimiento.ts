import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { aCentavos } from './centavos.js';
import {
  FechaDeReversionAnterior,
  MontoInvalido,
  MotivoDeAnulacionInvalido,
  MovimientoAnulado,
  MovimientoDeCheque,
  MovimientoDeTransferencia,
  MovimientoMarcadoEnConciliacion,
  MovimientoYaRevertido,
  NoEsUnaNota,
  NoEsUnSaldoInicial,
  NoSeCorrigeUnInverso,
  NoSeEliminaUnInverso,
  NoSeEliminaUnMovimientoRevertido,
  NoSeRevierteUnInverso,
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
}

const MAXIMO_DEL_MOTIVO = 500;

function datosValidos(datos: DatosDeMovimiento): DatosDeMovimiento {
  if (aCentavos(datos.monto) <= 0) throw new MontoInvalido();
  return datos;
}

function motivoValido(motivo: string): string {
  const limpio = motivo.trim();
  if (!limpio || limpio.length > MAXIMO_DEL_MOTIVO) throw new MotivoDeAnulacionInvalido();
  return limpio;
}

/**
 * Una nota de crédito (entra dinero), de débito o un cheque (sale). El monto siempre es positivo:
 * el tipo dice la dirección. Nada se borra sin más: anular crea el movimiento inverso (nota de
 * crédito ↔ débito) que lo compensa; solo un cheque en mes abierto se anula a la antigua, sin
 * inverso. Eliminar de verdad solo procede cuando queda «limpio» (lo decide quien llama, con datos
 * de consulta que la entidad no tiene, como si está marcado en una conciliación).
 */
export class Movimiento extends Entidad<MovimientoId> {
  private constructor(private propiedades: PropiedadesDeMovimiento) {
    super(propiedades.id);
  }

  /**
   * `vinculos.transferenciaId` solo lo pasa `RegistrarTransferencia`; `vinculos.revierteAId` solo lo
   * arma `revertirSinRevisar` al crear el inverso. Ninguno de los dos llega del usuario.
   */
  static crear(
    empresaId: Identificador<'Empresa'>,
    datos: DatosDeMovimiento,
    vinculos: { transferenciaId?: string | null; revierteAId?: string | null } = {},
  ): Movimiento {
    return new Movimiento({
      ...datosValidos(datos),
      empresaId,
      id: Identificador.nuevo(),
      anuladoEn: null,
      motivoDeAnulacion: null,
      transferenciaId: vinculos.transferenciaId ?? null,
      revertidoEn: null,
      motivoDeReversion: null,
      revierteAId: vinculos.revierteAId ?? null,
    });
  }

  static reconstruir(propiedades: PropiedadesDeMovimiento): Movimiento {
    return new Movimiento(propiedades);
  }

  /**
   * Corrige sus datos; la cuenta y `saldoInicial` no cambian (una nota no se vuelve saldo inicial ni al
   * revés; para cambiar de cuenta se anula y se registra en la otra).
   * @throws MovimientoAnulado o MovimientoYaRevertido si ya no está vigente; NoSeCorrigeUnInverso si es un inverso;
   *   MovimientoDeTransferencia o MovimientoDeCheque si no es suelto.
   */
  corregir(datos: DatosDeMovimiento): void {
    this.exigirVigente();
    if (this.esInverso) throw new NoSeCorrigeUnInverso();
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
   * Revierte la nota por sí sola: crea y devuelve su inverso (crédito ↔ débito), enlazado por
   * `revierteAId`, y la marca «revertida» (quién queda en la autoría de la nota, cuándo y con qué motivo).
   * @throws MovimientoAnulado o MovimientoYaRevertido si ya no está vigente; MovimientoDeTransferencia o
   *   MovimientoDeCheque si no es suelto; NoSeRevierteUnInverso si este movimiento ya es un inverso;
   *   FechaDeReversionAnterior si `fecha` es anterior a la del original; MotivoDeAnulacionInvalido si falta el motivo.
   */
  revertir(fecha: string, motivo: string): Movimiento {
    this.exigirSuelto();
    return this.revertirSinRevisar(fecha, motivo);
  }

  /**
   * Revierte la nota porque se anuló su transferencia: la única forma de revertir una nota que
   * pertenece a una (sus dos notas se revierten juntas, no sueltas).
   */
  revertirPorTransferencia(fecha: string, motivo: string): Movimiento {
    return this.revertirSinRevisar(fecha, motivo);
  }

  /**
   * Revierte el movimiento de un cheque porque su mes ya está conciliado (quedó en circulación y
   * nunca se cobró): el único modo por el que se revierte un movimiento `tipo === 'cheque'`. El
   * cheque en sí se anula aparte (`Cheque.anular`); este movimiento sigue contando en el saldo y
   * el inverso lo compensa, así no cambia ninguna conciliación ya autorizada.
   */
  revertirPorCheque(fecha: string, motivo: string): Movimiento {
    return this.revertirSinRevisar(fecha, motivo);
  }

  /**
   * Anula el movimiento de un cheque a la antigua (sin inverso, fuera del saldo): solo cuando su
   * mes todavía está abierto.
   * @throws MovimientoAnulado si ya está anulado; MotivoDeAnulacionInvalido si falta el motivo.
   */
  anularPorCheque(motivo: string): void {
    if (this.estaAnulado) throw new MovimientoAnulado();
    this.propiedades = { ...this.propiedades, anuladoEn: new Date(), motivoDeAnulacion: motivoValido(motivo) };
  }

  /**
   * Exige que se pueda eliminar de verdad: no revierte a otro y no fue revertido. Lo que la entidad
   * no sabe (si está marcado en una conciliación, si su fecha cae en un mes conciliado) lo revisa
   * quien llama, con datos de consulta.
   * @throws NoSeEliminaUnInverso si este movimiento es un inverso; NoSeEliminaUnMovimientoRevertido si fue revertido.
   */
  exigirEliminable(): void {
    if (this.propiedades.revierteAId) throw new NoSeEliminaUnInverso();
    if (this.propiedades.revertidoEn) throw new NoSeEliminaUnMovimientoRevertido();
  }

  /** @throws MovimientoMarcadoEnConciliacion si `conciliacionId` no es nulo. */
  exigirNoMarcadoEnConciliacion(conciliacionId: string | null): void {
    if (conciliacionId) throw new MovimientoMarcadoEnConciliacion();
  }

  get estaAnulado(): boolean {
    return this.propiedades.anuladoEn !== null;
  }

  get estaRevertido(): boolean {
    return this.propiedades.revertidoEn !== null;
  }

  /** Si este movimiento es el inverso de otro (lo creó una reversión). */
  get esInverso(): boolean {
    return this.propiedades.revierteAId !== null;
  }

  /**
   * Cuánto mueve el saldo de su cuenta, en centavos: positivo si entra, negativo si sale. Cero solo
   * si está anulado a la antigua (cheque en mes abierto): un movimiento revertido sigue contando,
   * porque su inverso es quien lo compensa.
   */
  get efectoEnCentavos(): number {
    if (this.estaAnulado) return 0;
    const monto = aCentavos(this.propiedades.monto);
    return this.propiedades.tipo === 'credito' ? monto : -monto;
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeMovimiento> {
    return { ...this.propiedades };
  }

  private revertirSinRevisar(fecha: string, motivo: string): Movimiento {
    this.exigirVigente();
    if (this.esInverso) throw new NoSeRevierteUnInverso();
    if (fecha < this.propiedades.fecha) throw new FechaDeReversionAnterior();
    const motivoDeReversion = motivoValido(motivo);
    const inverso = Movimiento.crear(
      this.propiedades.empresaId,
      {
        cuentaBancariaId: this.propiedades.cuentaBancariaId,
        tipo: this.propiedades.tipo === 'credito' ? 'debito' : 'credito',
        fecha,
        monto: this.propiedades.monto,
        saldoInicial: false,
        referencia: this.referenciaDeLaReversion(),
        beneficiario: this.propiedades.beneficiario,
        observaciones: this.propiedades.observaciones,
      },
      { revierteAId: this.id.valor },
    );
    this.propiedades = { ...this.propiedades, revertidoEn: new Date(), motivoDeReversion };
    return inverso;
  }

  private referenciaDeLaReversion(): string {
    const referencia = this.propiedades.referencia?.trim();
    return referencia ? `Reversión de ${referencia}` : `Reversión de movimiento del ${this.propiedades.fecha}`;
  }

  private exigirVigente(): void {
    if (this.estaAnulado) throw new MovimientoAnulado();
    if (this.estaRevertido) throw new MovimientoYaRevertido();
  }

  private exigirSuelto(): void {
    if (this.propiedades.transferenciaId) throw new MovimientoDeTransferencia();
    if (this.propiedades.tipo === 'cheque') throw new MovimientoDeCheque();
  }
}

import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { aCentavos } from './centavos.js';
import {
  NoSeReclasificaElSaldoInicial,
  NoSeReclasificaLoDeOtroModulo,
  NoSeReclasificaUnInverso,
  NoSeReclasificaUnaTransferencia,
} from './errores-de-conceptos.js';
import {
  FechaDeReversionAnterior,
  MontoInvalido,
  MotivoDeAnulacionInvalido,
  MovimientoAnulado,
  MovimientoDeCheque,
  MovimientoDeTransferencia,
  MovimientoMarcadoEnConciliacion,
  MovimientoSinNumero,
  MovimientoYaRevertido,
  NoEsUnaNota,
  NoEsUnSaldoInicial,
  NoSeCorrigeUnInverso,
  NoSeEliminaUnInverso,
  NoSeEliminaUnMovimientoRevertido,
  NoSeRevierteUnInverso,
} from './errores.js';
import type { DatosDeIntereses, PropiedadesDeIntereses } from './intereses.js';
import type { Numeracion } from './numeracion.js';
import type { OrigenDeMovimiento } from './origen-de-movimiento.js';

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
}

const MAXIMO_DEL_MOTIVO = 500;

function datosValidos(datos: DatosDeMovimiento): DatosDeMovimiento & Required<DatosDeIntereses> {
  if (aCentavos(datos.monto) <= 0) throw new MontoInvalido();
  return { ...datos, interesBruto: datos.interesBruto ?? null, isrRetenido: datos.isrRetenido ?? null };
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
   * arma `revertirSinRevisar` al crear el inverso; `vinculos.origen` solo lo pasa el módulo que genera el
   * movimiento (P6). Ninguno de los tres llega del usuario. El inverso no hereda el origen.
   */
  static crear(
    empresaId: Identificador<'Empresa'>,
    datos: DatosDeMovimiento,
    vinculos: { transferenciaId?: string | null; revierteAId?: string | null; origen?: OrigenDeMovimiento } = {},
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
      numero: null,
      anioDeNumero: 0,
      moduloDeOrigen: vinculos.origen?.modulo ?? null,
      documentoDeOrigenId: vinculos.origen?.documentoId ?? null,
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
   * Cambia solo el concepto (reclasificar): no toca dinero ni fechas, así que procede aunque el mes esté
   * conciliado. Un inverso, las notas de una transferencia y el saldo inicial no se reclasifican.
   * @returns el concepto que tenía antes.
   * @throws NoSeReclasificaUnInverso, NoSeReclasificaUnaTransferencia, NoSeReclasificaElSaldoInicial o
   *   NoSeReclasificaLoDeOtroModulo (lo corrige su módulo de origen).
   */
  reclasificar(conceptoId: string): string {
    if (this.esInverso) throw new NoSeReclasificaUnInverso();
    if (this.propiedades.transferenciaId) throw new NoSeReclasificaUnaTransferencia();
    if (this.propiedades.saldoInicial) throw new NoSeReclasificaElSaldoInicial();
    if (this.propiedades.moduloDeOrigen !== null) throw new NoSeReclasificaLoDeOtroModulo();
    const anterior = this.propiedades.conceptoId;
    this.propiedades = { ...this.propiedades, conceptoId };
    return anterior;
  }

  /** El inverso sigue a su original cuando este se reclasifica (hereda el concepto, sin validar nada, C2). */
  seguirAlOriginal(conceptoId: string): void {
    if (!this.esInverso) throw new Error('Solo un movimiento inverso sigue a su original.');
    this.propiedades = { ...this.propiedades, conceptoId };
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

  /**
   * Si le corresponde un número propio: las notas sueltas y los inversos que las revierten. No lo llevan
   * los cheques (tienen el de su chequera), el saldo inicial ni las dos notas de una transferencia (el
   * número va en la transferencia).
   */
  get llevaNumero(): boolean {
    const { tipo, saldoInicial, transferenciaId } = this.propiedades;
    return tipo !== 'cheque' && !saldoInicial && transferenciaId === null;
  }

  /**
   * Le asigna su número correlativo (o uno nuevo, si al corregirla cambió de tipo).
   * @throws MovimientoSinNumero si no le corresponde número.
   */
  numerar({ numero, anio }: Numeracion): void {
    if (!this.llevaNumero) throw new MovimientoSinNumero();
    this.propiedades = { ...this.propiedades, numero, anioDeNumero: anio };
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
        conceptoId: this.propiedades.conceptoId,
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

import { Entidad } from '../../core/compartido/dominio/entidad.js';
import type { Identificador } from '../../core/compartido/dominio/identificador.js';
import { aCentavos } from './centavos.js';
import { exigirPartidaQueSeAnula } from './anulacion-de-apertura.js';
import { datosDelInverso, type CambiosDelInverso } from './datos-del-inverso.js';

import {
  NoSeReclasificaElSaldoInicial,
  NoSeReclasificaLoDeOtroModulo,
  NoSeReclasificaUnInverso,
  NoSeReclasificaUnaTransferencia,
} from './errores-de-conceptos.js';
import {
  FechaDeReversionAnterior,
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
import { MovimientoDeOtroModulo, NotaNoMarcable } from './errores-de-origen.js';
import {
  datosDeLasPropiedades,
  datosValidos,
  exigirAbonoEnCuentaSoloEnCheque,
  motivoValido,
  propiedadesDeUnMovimientoNuevo,
  type VinculosDeUnMovimiento,
} from './nuevo-movimiento.js';
import type { Numeracion } from './numeracion.js';
import type { ParteDeApertura } from './partes-de-apertura.js';
import type { DatosDeMovimiento, MovimientoId, PropiedadesDeMovimiento } from './propiedades-de-movimiento.js';

export type { DatosDeMovimiento, MovimientoId, PropiedadesDeMovimiento } from './propiedades-de-movimiento.js';
export type { VinculosDeUnMovimiento } from './nuevo-movimiento.js';

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
   * `vinculos.transferenciaId` solo lo pasa `RegistrarTransferencia` (o lo hereda el inverso de una de sus notas);
   * `vinculos.revierteAId` solo lo
   * arma `revertirSinRevisar` al crear el inverso; `vinculos.origen` solo lo pasa el módulo que genera el
   * movimiento (P6); `vinculos.apertura` lo pasan solo los casos de uso de saldos iniciales. Ninguno llega del
   * usuario. El inverso no hereda el origen ni la parte de apertura.
   */
  static crear(
    empresaId: Identificador<'Empresa'>,
    datos: DatosDeMovimiento,
    vinculos: VinculosDeUnMovimiento = {},
  ): Movimiento {
    return new Movimiento(propiedadesDeUnMovimientoNuevo(empresaId, datos, vinculos));
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
    this.exigirSinOrigen();
    this.exigirSuelto();
    const { cuentaBancariaId, saldoInicial } = this.propiedades;
    this.propiedades = { ...this.propiedades, ...datosValidos({ ...datos, cuentaBancariaId, saldoInicial }) };
  }

  /**
   * El pago pasó a otro formulario: si la referencia era la que el sistema puso con el número anterior, toma la del
   * nuevo; una referencia escrita por quien emitió no se toca.
   */
  actualizarReferenciaAutomatica(anterior: string, nueva: string): void {
    if (this.propiedades.referencia === anterior) this.propiedades = { ...this.propiedades, referencia: nueva };
  }

  /**
   * Cambia la condición «para abono en cuenta» de un cheque vigente (corregirla antes de imprimirlo; quien llama revisa lo
   * demás). Blanquear la apaga.
   * @throws AbonoEnCuentaSoloEnCheque si no es un cheque; MovimientoAnulado o MovimientoYaRevertido si ya no está vigente.
   */
  cambiarParaAbonoEnCuenta(paraAbonoEnCuenta: boolean): void {
    this.exigirVigente();
    exigirAbonoEnCuentaSoloEnCheque(this.propiedades.tipo, paraAbonoEnCuenta);
    this.propiedades = { ...this.propiedades, paraAbonoEnCuenta };
  }

  /**
   * Corrige una partida de la apertura (cualquier parte menos el saldo global de antes): a diferencia de `corregir`,
   * también acepta un cheque (en circulación o posfechado). La cuenta, la parte y `saldoInicial` no cambian.
   * @throws NoEsUnSaldoInicial si el movimiento no es una partida; MovimientoAnulado o MovimientoYaRevertido si ya no
   *   está vigente; MontoInvalido si el monto no es mayor que cero.
   */
  corregirPartida(datos: DatosDeMovimiento): void {
    if (this.propiedades.parteDeApertura === null) throw new NoEsUnSaldoInicial();
    this.exigirVigente();
    const { cuentaBancariaId, saldoInicial } = this.propiedades;
    this.propiedades = { ...this.propiedades, ...datosValidos({ ...datos, cuentaBancariaId, saldoInicial }) };
  }

  /**
   * Convierte el saldo global de antes en el saldo del estado de cuenta al corte (la ventana de saldos iniciales
   * nueva): cambia de parte, fecha, tipo y monto.
   */
  convertirASaldoDelBanco(datos: Pick<DatosDeMovimiento, 'tipo' | 'fecha' | 'monto'>): void {
    this.corregirPartida({ ...datosDeLasPropiedades(this.propiedades), ...datos });
    this.propiedades = { ...this.propiedades, parteDeApertura: 'saldo_del_banco' };
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

  /**
   * Cambia el concepto de un movimiento con origen cuando su módulo fija el reparto: queda el concepto de mayor monto
   * (el que se ve en las listas). No es una reclasificación: la hace el módulo de origen, no el usuario.
   * @throws Error si el movimiento no tiene origen (ahí el concepto lo elige el usuario o lo fija la marca).
   */
  fijarConceptoDelReparto(conceptoId: string): void {
    if (this.propiedades.moduloDeOrigen === null) {
      throw new Error('Solo un movimiento con origen fija su concepto por reparto.');
    }
    this.propiedades = { ...this.propiedades, conceptoId };
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
    const { parteDeApertura } = this.propiedades;
    if (esSaldoInicial && parteDeApertura !== null && parteDeApertura !== 'saldo_global')
      throw new NoEsUnSaldoInicial();
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
   * Anula una partida de la carga inicial (cheque en circulación, depósito o débito en tránsito, error del banco): crea
   * su inverso con el concepto `anulacion_de_apertura`; en el depósito, el pagador queda como beneficiario del inverso.
   * @throws NoSeAnulaElSaldoDelBanco, ElPosfechadoSeAnulaComoCheque o PartidaDeAperturaNoEncontrada si no es de las que se
   *   anulan; los de `revertir` (ya revertida, fecha anterior, motivo).
   */
  revertirPartidaDeApertura(fecha: string, motivo: string, inverso: { conceptoId: string; pagador: string | null }) {
    exigirPartidaQueSeAnula(this.propiedades.parteDeApertura);
    const beneficiario = inverso.pagador ?? this.propiedades.beneficiario;
    return this.revertirSinRevisar(fecha, motivo, { conceptoId: inverso.conceptoId, beneficiario });
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
   * @throws NoSeEliminaUnInverso si este movimiento es un inverso; NoSeEliminaUnMovimientoRevertido si fue revertido;
   *   MovimientoDeOtroModulo si lo generó otro módulo.
   */
  exigirEliminable(): void {
    this.exigirSinOrigen();
    if (this.propiedades.revierteAId) throw new NoSeEliminaUnInverso();
    if (this.propiedades.revertidoEn) throw new NoSeEliminaUnMovimientoRevertido();
  }

  /**
   * Exige que sea una nota de débito suelta y vigente: la única clase que se marca para Cuentas por pagar (sin origen,
   * sin transferencia, ni inverso, ni saldo inicial, ni cheque).
   * @throws NotaNoMarcable si no lo es.
   */
  exigirNotaDeDebitoMarcable(): void {
    const { tipo, saldoInicial, transferenciaId, moduloDeOrigen } = this.propiedades;
    const suelta = tipo === 'debito' && !saldoInicial && transferenciaId === null && moduloDeOrigen === null;
    if (!suelta || this.esInverso || this.estaAnulado || this.estaRevertido) throw new NotaNoMarcable();
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

  /** La parte del saldo inicial que es; `null` si es un movimiento normal. */
  get parteDeApertura(): ParteDeApertura | null {
    return this.propiedades.parteDeApertura;
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

  private revertirSinRevisar(fecha: string, motivo: string, cambios?: CambiosDelInverso): Movimiento {
    this.exigirVigente();
    if (this.esInverso) throw new NoSeRevierteUnInverso();
    if (fecha < this.propiedades.fecha) throw new FechaDeReversionAnterior();
    const motivoDeReversion = motivoValido(motivo);
    const { empresaId, transferenciaId } = this.propiedades;
    const vinculos = { revierteAId: this.id.valor, transferenciaId };
    const inverso = Movimiento.crear(empresaId, datosDelInverso(this.propiedades, fecha, cambios), vinculos);
    this.propiedades = { ...this.propiedades, revertidoEn: new Date(), motivoDeReversion };
    return inverso;
  }

  private exigirVigente(): void {
    if (this.estaAnulado) throw new MovimientoAnulado();
    if (this.estaRevertido) throw new MovimientoYaRevertido();
  }

  private exigirSinOrigen(): void {
    if (this.propiedades.moduloDeOrigen !== null) throw new MovimientoDeOtroModulo();
  }

  private exigirSuelto(): void {
    if (this.propiedades.transferenciaId) throw new MovimientoDeTransferencia();
    if (this.propiedades.tipo === 'cheque') throw new MovimientoDeCheque();
  }
}

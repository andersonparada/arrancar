import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import { calcularConciliacion, type MovimientoParaConciliar } from '../aplicacion/calculo-de-conciliacion.js';
import type {
  ConciliacionDto,
  ConciliacionResumenDto,
  EstadoDeCuentaDto,
  MovimientoConMarcaDto,
} from '../aplicacion/dto/conciliacion.dto.js';
import type { ConsultasConciliaciones } from '../aplicacion/puertos/consultas-conciliaciones.js';
import type {
  RepositorioConciliaciones,
  ResumenDeLaUltimaConciliacion,
} from '../aplicacion/puertos/repositorio-conciliaciones.js';
import { aCentavos } from '../dominio/centavos.js';
import {
  type Conciliacion,
  finDelMesDe,
  inicioDelMesDe,
  periodoAnterior,
  type ConciliacionId,
} from '../dominio/conciliacion.js';
import { diferenciaConElEstadoDeCuenta } from '../dominio/estado-de-cuenta.js';
import { aMovimientoParaConciliar, aResumen, copia, ordenDescendente } from './ayudas-de-conciliaciones.js';
import type { DocumentosEnMemoria } from './dobles-de-estado-de-cuenta.js';
import type { MovimientosEnMemoria } from './dobles-de-movimientos.js';

/**
 * Guarda las conciliaciones en memoria y responde tanto de repositorio como de
 * consultas; las marcas se guardan aparte (no tocan la entidad Movimiento) y
 * necesita los movimientos de la cuenta para armar el documento: se vincula
 * con `vincularMovimientos` después de crear las dos.
 */
export class ConciliacionesEnMemoria implements RepositorioConciliaciones, ConsultasConciliaciones {
  readonly registros = new Map<string, Conciliacion>();
  /** conciliacionId → ids de movimientos marcados. */
  private readonly marcas = new Map<string, Set<string>>();
  private movimientos?: MovimientosEnMemoria;
  /** Para que el DTO muestre los datos del archivo del estado de cuenta. */
  documentos?: DocumentosEnMemoria;

  vincularMovimientos(movimientos: MovimientosEnMemoria): void {
    this.movimientos = movimientos;
  }

  async estadoDeCuentaDe(conciliacionId: string): Promise<EstadoDeCuentaDto | null> {
    return this.datosDelArchivo(this.registros.get(conciliacionId));
  }

  async buscar(id: ConciliacionId): Promise<Conciliacion | null> {
    const guardada = this.registros.get(id.valor);
    return guardada ? copia(guardada) : null;
  }

  async bloquear(id: ConciliacionId): Promise<Conciliacion | null> {
    return this.buscar(id);
  }

  async agregar(conciliacion: Conciliacion): Promise<void> {
    this.registros.set(conciliacion.id.valor, copia(conciliacion));
  }

  async guardar(conciliacion: Conciliacion): Promise<void> {
    this.registros.set(conciliacion.id.valor, copia(conciliacion));
  }

  async eliminar(id: ConciliacionId): Promise<void> {
    this.registros.delete(id.valor);
    this.marcas.delete(id.valor);
  }

  async ultimaDeLaCuenta(cuentaBancariaId: string): Promise<ResumenDeLaUltimaConciliacion | null> {
    const ultima = this.deLaCuenta(cuentaBancariaId).sort((a, b) =>
      ordenDescendente(a.instantanea(), b.instantanea()),
    )[0];
    if (!ultima) return null;
    const { id, anio, mes, estado } = ultima.instantanea();
    return { id: id.valor, anio, mes, estado };
  }

  async guardarMarcas(conciliacionId: string, movimientoIds: string[]): Promise<void> {
    this.marcas.set(conciliacionId, new Set(movimientoIds));
  }

  async listar(cuentaBancariaId: string): Promise<ConciliacionResumenDto[]> {
    return this.deLaCuenta(cuentaBancariaId).map(aResumen).sort(ordenDescendente);
  }

  async obtener(conciliacionId: string): Promise<ConciliacionDto> {
    const conciliacion = this.registros.get(conciliacionId);
    if (!conciliacion) throw new RecursoNoEncontrado('La conciliación');
    return this.armarDto(conciliacion);
  }

  async idsDeCandidatos(cuentaBancariaId: string, finDelMes: string, conciliacionId: string): Promise<string[]> {
    const candidatos = await this.candidatosConMarca(cuentaBancariaId, finDelMes, conciliacionId);
    return candidatos.map((c) => c.id);
  }

  async tieneAlguna(cuentaBancariaId: string): Promise<boolean> {
    return this.deLaCuenta(cuentaBancariaId).length > 0;
  }

  /** Como en Postgres: pares original + inverso donde ninguno se marcó en otra conciliación, con fecha hasta `finDelMes`. */
  async paresCompensadosPendientes(
    cuentaBancariaId: string,
    finDelMes: string,
    conciliacionId: string,
  ): Promise<string[]> {
    if (!this.movimientos) throw new Error('Vincule los movimientos primero: vincularMovimientos(movimientos).');
    const deOtras = [...this.marcas.entries()].filter(([id]) => id !== conciliacionId);
    const marcadosAlgunaVez = new Set(deOtras.flatMap(([, ids]) => [...ids]));
    const todos = await this.movimientos.listar({ cuentaBancariaId });
    const pendientes = todos.filter((m) => !marcadosAlgunaVez.has(m.id) && m.fecha <= finDelMes);
    const idsPendientes = new Set(pendientes.map((m) => m.id));
    const resultado = new Set<string>();
    for (const m of pendientes) {
      if (m.revierteAId && idsPendientes.has(m.revierteAId)) {
        resultado.add(m.id);
        resultado.add(m.revierteAId);
      }
    }
    return [...resultado];
  }

  private async calcularDocumento(conciliacion: Conciliacion) {
    const { id, cuentaBancariaId, anio, mes } = conciliacion.instantanea();
    const periodo = { anio, mes };
    const finDelMes = finDelMesDe(periodo);
    const candidatos = await this.candidatosConMarca(cuentaBancariaId, finDelMes, id.valor);
    const { librosEnCentavos, bancoEnCentavos } = await this.saldosIniciales(cuentaBancariaId, periodo);
    const movimientosDelMes = await this.movimientosDelMes(cuentaBancariaId, periodo);
    const resultado = calcularConciliacion({
      saldoInicialLibrosEnCentavos: librosEnCentavos,
      saldoInicialBancoEnCentavos: bancoEnCentavos,
      movimientosDelMes,
      candidatos: candidatos.map(aMovimientoParaConciliar),
    });
    return { candidatos, resultado };
  }

  private aEncabezado(conciliacion: Conciliacion) {
    const { id, cuentaBancariaId, anio, mes, estado, saldoEstadoDeCuenta, previaAlSaldoTranscrito } =
      conciliacion.instantanea();
    const sinNombres = { cuentaBancariaNombre: null, bancoNombre: null, numeroDeCuenta: null, empresaNombre: null };
    const sinPersonas = { elaboradaPorNombre: null, elaboradaEn: null, autorizadaPorNombre: null, autorizadaEn: null };
    return {
      ...{ id: id.valor, cuentaBancariaId, anio, mes, estado, saldoEstadoDeCuenta, previaAlSaldoTranscrito },
      ...sinNombres,
      ...sinPersonas,
    };
  }

  private async armarDto(conciliacion: Conciliacion): Promise<ConciliacionDto> {
    const { estado, foto, saldoEstadoDeCuenta } = conciliacion.instantanea();
    const estadoDeCuenta = this.datosDelArchivo(conciliacion);
    const { candidatos, resultado } = await this.calcularDocumento(conciliacion);
    const saldoQueDebeMostrarElEstadoDeCuenta =
      estado === 'autorizada' && foto
        ? foto.saldoCalculadoEstadoDeCuenta
        : resultado.saldoQueDebeMostrarElEstadoDeCuenta;
    return {
      ...this.aEncabezado(conciliacion),
      estadoDeCuenta,
      candidatos,
      cuadratica: { libros: resultado.libros, banco: resultado.banco },
      partidas: resultado.partidas,
      saldoQueDebeMostrarElEstadoDeCuenta,
      diferenciaConElEstadoDeCuenta: diferenciaConElEstadoDeCuenta(
        saldoEstadoDeCuenta,
        saldoQueDebeMostrarElEstadoDeCuenta,
      ),
    };
  }

  private datosDelArchivo(conciliacion: Conciliacion | undefined): EstadoDeCuentaDto | null {
    const archivoId = conciliacion?.instantanea().estadoDeCuentaArchivoId ?? null;
    return this.documentos?.datosDelEstadoDeCuenta(archivoId) ?? null;
  }

  private deLaCuenta(cuentaBancariaId: string): Conciliacion[] {
    return [...this.registros.values()].filter((c) => c.instantanea().cuentaBancariaId === cuentaBancariaId);
  }

  private async saldosIniciales(cuentaBancariaId: string, periodo: { anio: number; mes: number }) {
    if (!this.movimientos) throw new Error('Vincule los movimientos primero: vincularMovimientos(movimientos).');
    const finDelMesAnterior = finDelMesDe(periodoAnterior(periodo));
    const librosEnCentavos = aCentavos(await this.movimientos.saldoAlFinDe(cuentaBancariaId, finDelMesAnterior));
    const anterior = periodoAnterior(periodo);
    const previa = this.deLaCuenta(cuentaBancariaId)
      .map((c) => c.instantanea())
      .find((p) => p.anio === anterior.anio && p.mes === anterior.mes);
    const bancoEnCentavos = previa?.foto ? aCentavos(previa.foto.saldoCalculadoEstadoDeCuenta) : 0;
    return { librosEnCentavos, bancoEnCentavos };
  }

  private async movimientosDelMes(
    cuentaBancariaId: string,
    periodo: { anio: number; mes: number },
  ): Promise<MovimientoParaConciliar[]> {
    if (!this.movimientos) throw new Error('Vincule los movimientos primero: vincularMovimientos(movimientos).');
    const filas = await this.movimientos.vigentesEntre(cuentaBancariaId, inicioDelMesDe(periodo), finDelMesDe(periodo));
    return filas.map((m) => aMovimientoParaConciliar({ ...m, marcado: false }));
  }

  /**
   * Ids marcados en una conciliación de un mes ANTERIOR: no son candidatos aquí.
   * Lo marcado en un mes posterior seguía pendiente en este, como en Postgres.
   */
  private marcadosAntesDe(finDelMes: string): Set<string> {
    const anteriores = new Set<string>();
    for (const [id, movimientoIds] of this.marcas) {
      const conciliacion = this.registros.get(id);
      if (!conciliacion || conciliacion.finDelMes() >= finDelMes) continue;
      for (const movimientoId of movimientoIds) anteriores.add(movimientoId);
    }
    return anteriores;
  }

  private async candidatosConMarca(
    cuentaBancariaId: string,
    finDelMes: string,
    conciliacionId: string,
  ): Promise<MovimientoConMarcaDto[]> {
    if (!this.movimientos) throw new Error('Vincule los movimientos primero: vincularMovimientos(movimientos).');
    const marcados = this.marcas.get(conciliacionId) ?? new Set<string>();
    const marcadosAntes = this.marcadosAntesDe(finDelMes);
    const todos = await this.movimientos.listar({ cuentaBancariaId });
    return todos
      .filter((m) => !m.anuladoEn && m.fecha <= finDelMes && !marcadosAntes.has(m.id))
      .map((m) => ({ ...m, marcado: marcados.has(m.id) }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
}

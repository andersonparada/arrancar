import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import { calcularConciliacion, type MovimientoParaConciliar } from '../aplicacion/calculo-de-conciliacion.js';
import type {
  ConciliacionDto,
  ConciliacionResumenDto,
  MovimientoConMarcaDto,
} from '../aplicacion/dto/conciliacion.dto.js';
import type { ConsultasConciliaciones } from '../aplicacion/puertos/consultas-conciliaciones.js';
import type {
  RepositorioConciliaciones,
  ResumenDeLaUltimaConciliacion,
} from '../aplicacion/puertos/repositorio-conciliaciones.js';
import { aCentavos } from '../dominio/centavos.js';
import {
  Conciliacion,
  finDelMesDe,
  inicioDelMesDe,
  periodoAnterior,
  type ConciliacionId,
} from '../dominio/conciliacion.js';
import type { MovimientosEnMemoria } from './dobles-de-movimientos.js';

const copia = (conciliacion: Conciliacion) => Conciliacion.reconstruir(conciliacion.instantanea());

function ordenDescendente(a: { anio: number; mes: number }, b: { anio: number; mes: number }): number {
  return b.anio - a.anio || b.mes - a.mes;
}

function aMovimientoParaConciliar(m: MovimientoConMarcaDto): MovimientoParaConciliar {
  const { id, tipo, fecha, monto, numeroDeCheque, beneficiario, referencia, marcado } = m;
  return { id, tipo, fecha, monto, numeroDeCheque, beneficiario, referencia, marcado };
}

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

  vincularMovimientos(movimientos: MovimientosEnMemoria): void {
    this.movimientos = movimientos;
  }

  async buscar(id: ConciliacionId): Promise<Conciliacion | null> {
    const guardada = this.registros.get(id.valor);
    return guardada ? copia(guardada) : null;
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
    return this.deLaCuenta(cuentaBancariaId)
      .map((c) => this.aResumen(c))
      .sort(ordenDescendente);
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
    const { id, cuentaBancariaId, anio, mes, estado } = conciliacion.instantanea();
    return {
      id: id.valor,
      cuentaBancariaId,
      cuentaBancariaNombre: null,
      bancoNombre: null,
      numeroDeCuenta: null,
      empresaNombre: null,
      anio,
      mes,
      estado,
      elaboradaPorNombre: null,
      elaboradaEn: null,
      autorizadaPorNombre: null,
      autorizadaEn: null,
    };
  }

  private async armarDto(conciliacion: Conciliacion): Promise<ConciliacionDto> {
    const { estado, foto } = conciliacion.instantanea();
    const { candidatos, resultado } = await this.calcularDocumento(conciliacion);
    const saldoQueDebeMostrarElEstadoDeCuenta =
      estado === 'autorizada' && foto
        ? foto.saldoCalculadoEstadoDeCuenta
        : resultado.saldoQueDebeMostrarElEstadoDeCuenta;
    return {
      ...this.aEncabezado(conciliacion),
      candidatos,
      cuadratica: { libros: resultado.libros, banco: resultado.banco },
      partidas: resultado.partidas,
      saldoQueDebeMostrarElEstadoDeCuenta,
    };
  }

  private deLaCuenta(cuentaBancariaId: string): Conciliacion[] {
    return [...this.registros.values()].filter((c) => c.instantanea().cuentaBancariaId === cuentaBancariaId);
  }

  private aResumen(conciliacion: Conciliacion): ConciliacionResumenDto {
    const { id, anio, mes, estado } = conciliacion.instantanea();
    return { id: id.valor, anio, mes, estado, elaboradaEn: null, autorizadaEn: null };
  }

  private async saldosIniciales(cuentaBancariaId: string, periodo: { anio: number; mes: number }) {
    if (!this.movimientos) throw new Error('Vincule los movimientos primero: vincularMovimientos(movimientos).');
    const finDelMesAnterior = finDelMesDe(periodoAnterior(periodo));
    const librosEnCentavos = aCentavos(await this.movimientos.saldoAlFinDe(cuentaBancariaId, finDelMesAnterior));
    const anterior = periodoAnterior(periodo);
    const previa = this.deLaCuenta(cuentaBancariaId)
      .map((c) => c.instantanea())
      .find((p) => p.anio === anterior.anio && p.mes === anterior.mes);
    const bancoEnCentavos = previa?.foto ? aCentavos(previa.foto.saldoCalculadoEstadoDeCuenta) : librosEnCentavos;
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

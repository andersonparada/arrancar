import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import { calcularDiferencia, calcularSaldoConciliado } from '../aplicacion/calculo-de-conciliacion.js';
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
import { aCentavos, deCentavos, efectoEnCentavos } from '../dominio/centavos.js';
import { Conciliacion, type ConciliacionId, finDelMesDe } from '../dominio/conciliacion.js';
import type { MovimientosEnMemoria } from './dobles-de-movimientos.js';

const copia = (conciliacion: Conciliacion) => Conciliacion.reconstruir(conciliacion.instantanea());

function ordenDescendente(a: { anio: number; mes: number }, b: { anio: number; mes: number }): number {
  return b.anio - a.anio || b.mes - a.mes;
}

/**
 * Guarda las conciliaciones en memoria y responde tanto de repositorio como de
 * consultas; las marcas se guardan aparte (no tocan la entidad Movimiento) y
 * necesita los movimientos de la cuenta para calcular los candidatos: se
 * vincula con `vincularMovimientos` después de crear las dos.
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
    const { id, anio, mes, cerradaEn } = ultima.instantanea();
    return { id: id.valor, anio, mes, cerrada: cerradaEn !== null };
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
    const { cuentaBancariaId, anio, mes, saldoSegunBanco, cerradaEn } = conciliacion.instantanea();
    const saldoAnterior = this.saldoAnteriorDe(cuentaBancariaId, anio, mes);
    const movimientos = await this.candidatosConMarca(cuentaBancariaId, finDelMesDe({ anio, mes }), conciliacionId);
    const resumen = this.calcularResumen(saldoAnterior, saldoSegunBanco, movimientos);
    return {
      id: conciliacionId,
      cuentaBancariaId,
      cuentaBancariaNombre: null,
      anio,
      mes,
      saldoSegunBanco,
      saldoAnterior,
      movimientos,
      cerrada: cerradaEn !== null,
      ...resumen,
    };
  }

  private calcularResumen(saldoAnterior: string, saldoSegunBanco: string, movimientos: MovimientoConMarcaDto[]) {
    const saldoConciliadoEnCentavos = calcularSaldoConciliado(
      aCentavos(saldoAnterior),
      movimientos.map((m) => ({ efectoEnCentavos: efectoEnCentavos(m.tipo, m.monto), marcado: m.marcado })),
    );
    const diferenciaEnCentavos = calcularDiferencia(aCentavos(saldoSegunBanco), saldoConciliadoEnCentavos);
    return { saldoConciliado: deCentavos(saldoConciliadoEnCentavos), diferencia: deCentavos(diferenciaEnCentavos) };
  }

  async idsDeCandidatos(cuentaBancariaId: string, finDelMes: string, conciliacionId: string): Promise<string[]> {
    const candidatos = await this.candidatosConMarca(cuentaBancariaId, finDelMes, conciliacionId);
    return candidatos.map((c) => c.id);
  }

  private deLaCuenta(cuentaBancariaId: string): Conciliacion[] {
    return [...this.registros.values()].filter((c) => c.instantanea().cuentaBancariaId === cuentaBancariaId);
  }

  private aResumen(conciliacion: Conciliacion): ConciliacionResumenDto {
    const { id, anio, mes, saldoSegunBanco, cerradaEn } = conciliacion.instantanea();
    return { id: id.valor, anio, mes, saldoSegunBanco, cerrada: cerradaEn !== null };
  }

  private saldoAnteriorDe(cuentaBancariaId: string, anio: number, mes: number): string {
    const anteriores = this.deLaCuenta(cuentaBancariaId)
      .map((c) => c.instantanea())
      .filter((p) => p.anio < anio || (p.anio === anio && p.mes < mes))
      .sort(ordenDescendente);
    return anteriores[0]?.saldoSegunBanco ?? '0.00';
  }

  /** Ids marcados en OTRA conciliación: no son candidatos aquí. */
  private marcadosEnOtra(conciliacionId: string): Set<string> {
    const otros = new Set<string>();
    for (const [id, movimientoIds] of this.marcas) {
      if (id === conciliacionId) continue;
      for (const movimientoId of movimientoIds) otros.add(movimientoId);
    }
    return otros;
  }

  private async candidatosConMarca(
    cuentaBancariaId: string,
    finDelMes: string,
    conciliacionId: string,
  ): Promise<MovimientoConMarcaDto[]> {
    if (!this.movimientos) throw new Error('Vincule los movimientos primero: vincularMovimientos(movimientos).');
    const marcados = this.marcas.get(conciliacionId) ?? new Set<string>();
    const marcadosEnOtra = this.marcadosEnOtra(conciliacionId);
    const todos = await this.movimientos.listar({ cuentaBancariaId });
    return todos
      .filter((m) => !m.anuladoEn && m.fecha <= finDelMes && !marcadosEnOtra.has(m.id))
      .map((m) => ({ ...m, marcado: marcados.has(m.id) }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
}
